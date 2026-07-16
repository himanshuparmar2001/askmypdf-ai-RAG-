from fastapi import FastAPI
from pydantic import BaseModel
from fastapi import UploadFile, File
import shutil
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()


embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context. 
If the answer is not in the context, say "I don't know based on the provided document."

Context:
{context}

Question:
{question}
""")

class Question(BaseModel):
    question: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://askmypdf-ai-rag.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, AskMyPDF AI backend is running!"}

@app.get("/greet/{name}")
def greet_user(name: str):
    return {"message": f"Hello, {name}! Welcome to AskMyPDF AI."}

@app.post("/ask-test")
def ask_test(payload: Question):
    return {"you_asked": payload.question, "answer": "This is a placeholder answer."}

UPLOAD_DIR = "uploads"

@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files are allowed."}

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Load and process the PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(documents)

    vectorstore = FAISS.from_documents(chunks, embedding_model)
    vectorstore.save_local("vectorstore/faiss_index")

    return {
        "filename": file.filename,
        "message": "File uploaded and processed successfully",
        "num_pages": len(documents),
        "num_chunks": len(chunks)
    }

@app.post("/ask")
def ask_question(payload: Question):
    vectorstore = FAISS.load_local(
        "vectorstore/faiss_index",
        embedding_model,
        allow_dangerous_deserialization=True
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    results = retriever.invoke(payload.question)

    context_text = "\n\n".join([doc.page_content for doc in results])

    chain = prompt | llm
    response = chain.invoke({"context": context_text, "question": payload.question})

    source_pages = sorted(set(doc.metadata.get("page") for doc in results))

    return {
        "answer": response.content,
        "source_pages": source_pages
    }
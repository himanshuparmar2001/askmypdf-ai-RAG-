from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


loader = PyPDFLoader("uploads/ES.pdf")
documents = loader.load()

print(f"Number of pages loaded: {len(documents)}")
print("---- First page content preview ----")
print(documents[0].page_content[:500])
print("---- First page metadata ----")
print(documents[0].metadata)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

chunks = text_splitter.split_documents(documents)

print(f"Number of chunks created: {len(chunks)}")
print("---- First chunk ----")
print(chunks[0].page_content)
print("---- First chunk metadata ----")
print(chunks[0].metadata)

from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

sample_text = chunks[0].page_content
vector = embedding_model.embed_query(sample_text)

print(f"Vector length: {len(vector)}")
print(f"First 10 values: {vector[:10]}")


from langchain_community.vectorstores import FAISS

vectorstore = FAISS.from_documents(chunks, embedding_model)

vectorstore.save_local("vectorstore/faiss_index")

print("Vector store created and saved successfully!")

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

query = "What is this document about?"  # change this to something relevant to your PDF
results = retriever.invoke(query)

print(f"Number of chunks retrieved: {len(results)}")
for i, doc in enumerate(results):
    print(f"\n--- Result {i+1} (Page {doc.metadata.get('page')}) ---")
    print(doc.page_content[:300])


from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context. 
If the answer is not in the context, say "I don't know based on the provided document."

Context:
{context}

Question:
{question}
""")

context_text = "\n\n".join([doc.page_content for doc in results])

chain = prompt | llm

response = chain.invoke({"context": context_text, "question": query})

print("---- LLM Answer ----")
print(response.content)

source_pages = sorted(set(doc.metadata.get("page") for doc in results))
print("\n---- Source Pages ----")
print(source_pages)
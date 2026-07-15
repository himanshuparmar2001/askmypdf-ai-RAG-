import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploaded, setIsUploaded] = useState(false)
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isAsking, setIsAsking] = useState(false)

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setUploadStatus('')
    setIsUploaded(false)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Choose a PDF first.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    setUploadStatus('Reading and indexing your document...')

    try {
      const response = await axios.post('http://127.0.0.1:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadStatus(`Ready: ${response.data.num_pages} pages, ${response.data.num_chunks} chunks indexed.`)
      setIsUploaded(true)
    } catch (error) {
      setUploadStatus('Upload failed. Check the console for details.')
      setIsUploaded(false)
      console.error(error)
    }
  }

  const handleAsk = async () => {
    if (!question.trim()) return

    const currentQuestion = question
    setQuestion('')
    setIsAsking(true)

    try {
      const response = await axios.post('http://127.0.0.1:8000/ask', {
        question: currentQuestion
      })

      setChatHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: response.data.answer,
          sourcePages: response.data.source_pages
        }
      ])
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { question: currentQuestion, answer: 'Something went wrong getting an answer. Check the console.', sourcePages: [] }
      ])
      console.error(error)
    } finally {
      setIsAsking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isAsking) {
      handleAsk()
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1B2430]">
      <header className="border-b border-[#E4E1D6] px-6 py-5">
        <h1 className="font-serif text-2xl tracking-tight">AskMyPDF AI</h1>
        <p className="text-sm text-[#6B6858] mt-1">Ask questions about your document, get answers with page citations.</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">

        <aside className="border border-[#E4E1D6] rounded-lg bg-white p-5 h-fit">
          <h2 className="font-serif text-base mb-3">Your document</h2>

          <label className="block border-2 border-dashed border-[#D8D4C4] rounded-md p-4 text-center cursor-pointer hover:border-[#C7942C] transition-colors">
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <span className="text-sm text-[#6B6858]">
              {selectedFile ? selectedFile.name : 'Click to choose a PDF'}
            </span>
          </label>

          <button
            onClick={handleUpload}
            className="w-full mt-3 bg-[#1B2430] text-white text-sm py-2 rounded-md hover:bg-[#2A3646] transition-colors"
          >
            Upload and index
          </button>

          {uploadStatus && (
            <p className={`text-xs mt-3 leading-relaxed ${isUploaded ? 'text-[#3B6D11]' : 'text-[#6B6858]'}`}>
              {uploadStatus}
            </p>
          )}
        </aside>

        <section className="flex flex-col">
          <div className="flex-1 space-y-5 mb-4 min-h-[300px]">
            {chatHistory.length === 0 && (
              <div className="text-center text-[#9A967F] text-sm py-16 border border-dashed border-[#E4E1D6] rounded-lg">
                Upload a PDF, then ask your first question here.
              </div>
            )}

            {chatHistory.map((entry, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-end">
                  <p className="bg-[#1B2430] text-white text-sm rounded-lg rounded-br-sm px-4 py-2 max-w-[80%]">
                    {entry.question}
                  </p>
                </div>

                <div className="flex justify-start">
                  <div className="bg-white border border-[#E4E1D6] text-sm rounded-lg rounded-bl-sm px-4 py-3 max-w-[80%]">
                    <p className="leading-relaxed">{entry.answer}</p>
                    {entry.sourcePages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {entry.sourcePages.map((p) => (
                          <span
                            key={p}
                            className="text-xs font-medium bg-[#FAEEDA] text-[#854F0B] px-2 py-0.5 rounded"
                          >
                            Page {p + 1}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isAsking && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E4E1D6] text-sm rounded-lg rounded-bl-sm px-4 py-3 text-[#9A967F]">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 border border-[#E4E1D6] bg-white rounded-lg p-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the PDF..."
              className="flex-1 text-sm px-2 outline-none bg-transparent"
            />
            <button
              onClick={handleAsk}
              disabled={isAsking}
              className="bg-[#C7942C] text-white text-sm px-4 py-2 rounded-md hover:bg-[#B08325] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAsking ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
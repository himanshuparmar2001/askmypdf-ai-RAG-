import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isAsking, setIsAsking] = useState(false)

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setUploadStatus('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file first.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)

    setUploadStatus('Uploading...')

    try {
      const response = await axios.post('http://127.0.0.1:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadStatus(`Uploaded! ${response.data.num_pages} pages, ${response.data.num_chunks} chunks processed.`)
    } catch (error) {
      setUploadStatus('Upload failed. Check console for details.')
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
        { question: currentQuestion, answer: 'Error getting answer. Check console.', sourcePages: [] }
      ])
      console.error(error)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div>
      <h1>AskMyPDF AI</h1>

      <section>
        <input type="file" accept=".pdf" onChange={handleFileChange} />
        {selectedFile && <p>Selected: {selectedFile.name}</p>}
        <button onClick={handleUpload}>Upload PDF</button>
        {uploadStatus && <p>{uploadStatus}</p>}
      </section>

      <hr />

      <section>
        <div>
          {chatHistory.map((entry, index) => (
            <div key={index}>
              <p><strong>You:</strong> {entry.question}</p>
              <p><strong>AI:</strong> {entry.answer}</p>
              {entry.sourcePages.length > 0 && (
                <p><em>Source pages: {entry.sourcePages.map(p => p + 1).join(', ')}</em></p>
              )}
              <hr />
            </div>
          ))}
        </div>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the PDF..."
        />
        <button onClick={handleAsk} disabled={isAsking}>
          {isAsking ? 'Thinking...' : 'Ask'}
        </button>
      </section>
    </div>
  )
}

export default App
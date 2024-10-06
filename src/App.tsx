import { useState, useEffect } from 'react'
import styles from './App.module.css'
import OpenAI from 'openai'
import OntologyBuilder from './components/OntologyBuilder'

function App() {
  const [showModal, setShowModal] = useState(false);
  const [openai, setOpenai] = useState<OpenAI | null>(null);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      createOpenAIConfig(storedApiKey);
    } else {
      setShowModal(true);
    }
  }, []);

  const createOpenAIConfig = (key: string) => {
    setOpenai(new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true,
    }));
  };

  const handleApiKeySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newApiKey = formData.get('apiKey') as string;
    if (newApiKey) {
      localStorage.setItem('openai_api_key', newApiKey);
      createOpenAIConfig(newApiKey);
      setShowModal(false);
    }
  };

  return (
    <div className={styles.app}>
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <form onSubmit={handleApiKeySubmit}>
              <h2 className={styles.modalTitle}>Enter your OpenAI API Key</h2>
              <input
                type="text"
                name="apiKey"
                placeholder="sk-..."
                required
                className={styles.modalInput}
              />
              <button type="submit" className={styles.modalButton}>
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {openai && <OntologyBuilder openai={openai} />}
    </div>
  )
}

export default App

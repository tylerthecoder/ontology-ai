import { useState } from 'react'
import OpenAI from 'openai'
import * as RDFLib from "rdflib"
import styles from './OntologyBuilder.module.css'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

const ontology = RDFLib.graph();

const SYSTEM_MESSAGE = { "role": "system", "content": "You are a helpful analytical assistant that builds ontologies for peoples belief systems. You will work in the turtle syntax for owl. Be very formal and logical with your responses. Make sure to define the owl, rdfs and xsd prefixes and only use those prefixes. Also include an ex prefix for all new concepts. Try to break up the ontology into as many classes as you can and be very concise with the definitions. Only make classes, do not make individuals unless explicitly asked to do so." } as const;

// PROMPTS
const createPrompt = (statement: string) => `You will be given a plain english statement. You will create an ontology by calling your function. Here is the prompt: ${statement}`
const updatePrompt = (ontology: string, update: string) => `You will be given an ontology and a plain english sentence that you will interpret to make a new ontology. You will output this ontology by calling your function. Make sure not to remove any information from the original ontoloty. Here is the ontology ${ontology}. Here is the update ${update}`
const reasonPrompt = (ontology: string, question: string) => `You will be given an ontology in the owl language with turtle syntax. You will be asked to answer a question about the ontology. Here is the ontology: ${ontology}. Here is the question: ${question}`
const clarifyPrompt = (ontology: string) => `You will be given an ontology in the owl language with turtle syntax. I want you to read it and ask a single clarifying question that could make the ontology more robust. Give 2 possible answers that could be implemented. Here is the ontology: ${ontology}`
const compressPrompt = (ontology: string) => `You will be given an ontology. I want you to read it and compress it into a more consice ontology by calling your function. This could be noticing redundancies and removing them or abstracting some concept. Here is the ontology: ${ontology}`

const acceptSuggestion = (number: 1 | 2) => `Implement the suggestion using the turtle syntax make sure to include the prefixes ${number}`

const extractOntology = (text: string): string => {
  RDFLib.parse(text, ontology, "http://example.org/", "text/turtle");
  console.log(ontology);
  return text;
}

interface OntologyBuilderProps {
  openai: OpenAI;
}

const models = [
  { value: "gpt-4o", label: "GPT-4O" },
  { value: "gpt-4o-mini", label: "GPT-4O Mini" },
  { value: "o1-preview", label: "O1 Preview" },
  { value: "o1-mini", label: "O1 Mini" },
];

function OntologyBuilder({ openai }: OntologyBuilderProps) {
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");
  const [clairfyText, setClairfyText] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(models[0].value);
  const [isLoading, setIsLoading] = useState(false);

  const ask = async (prompt: string, messages: ChatCompletionMessageParam[] = []) => {
    setIsLoading(true);
    try {
      console.log("Asking")
      const data = await openai.chat.completions.create({
        model: selectedModel,
        functions: [{
          name: "create",
          description: "Use this function to create an ontology. Output should be owl code with the turtle syntax",
          parameters: {
            type: "object",
            properties: {
              ontology: {
                type: "string",
                description: "The owl ontology that describes the ontology to make"
              }
            },
            required: ["ontology"]
          }
        }],
        messages: [
          SYSTEM_MESSAGE,
          ...messages,
          { "role": "user", "content": prompt },
        ],
      });
      const message = data.choices[0].message;

      if (!message) {
        throw new Error("No message");
      }

      console.log("Got message", message);
      return message;
    } finally {
      setIsLoading(false);
    }
  }

  async function handle(prompt: string) {
    const message = await ask(prompt);

    const func = message.function_call

    if (!func || !func.arguments)
      return

    const data = JSON.parse(func.arguments);

    if (func.name === "create") {
      const ontology = extractOntology(data.ontology);
      setResponse(ontology);
    }
  }

  const add = async () => {
    handle(createPrompt(message));
  }

  const update = async () => {
    handle(updatePrompt(response, message));
  }

  const reason = async () => {
    const r = await ask(reasonPrompt(response, message));
    alert(r.content);
  }

  const compress = async () => {
    handle(compressPrompt(response));
  }

  const clarify = async () => {
    const r = await ask(clarifyPrompt(response));
    setClairfyText(r.content);
  }

  const clarifyOption1 = async () => {
    if (!clairfyText) {
      throw new Error("No clarify text");
    }
    const res = await ask(acceptSuggestion(1), [
      { role: "assistant", content: clairfyText },
      { "role": "user", "content": message },
    ]);
    // Implement the logic to handle the clarification result
  }

  const clarifyOption2 = async () => {
    if (!clairfyText) {
      throw new Error("No clarify text");
    }
    const res = await ask(acceptSuggestion(2), [
      { role: "assistant", content: clairfyText },
      { "role": "user", "content": message },
    ]);
    // Implement the logic to handle the clarification result
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ontology Builder</h1>
      <div className={styles.modelSelector}>
        <label htmlFor="model-select">Select Model:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className={styles.select}
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.responseContainer}>
        {isLoading ? (
          <div className={styles.spinner}></div>
        ) : (
          <p className={styles.response}>{response}</p>
        )}
      </div>
      <div className={styles.inputContainer}>
        <input
          className={styles.input}
          type="text"
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
        />
        <div className={styles.buttonContainer}>
          <button onClick={() => add()} disabled={isLoading}>Enter</button>
          <button onClick={() => update()} disabled={isLoading}>Update</button>
          <button onClick={() => reason()} disabled={isLoading}>Reason</button>
          <button onClick={() => clarify()} disabled={isLoading}>Clarify</button>
          <button onClick={() => compress()} disabled={isLoading}>Compress</button>
        </div>
      </div>
      {clairfyText && (
        <div className={styles.clarifyContainer}>
          <p className={styles.clarifyText}>{clairfyText}</p>
          <div className={styles.clarifyButtons}>
            <button onClick={() => clarifyOption1()} disabled={isLoading}>Option 1</button>
            <button onClick={() => clarifyOption2()} disabled={isLoading}>Option 2</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OntologyBuilder
export const AGENT_FLOW_TEMPLATES = [
  {
    id: 'empty',
    name: 'Vacío',
    description: 'Comienza con un flujo en blanco.',
    flow: {
      steps: []
    }
  },
  {
    id: 'orchestrator',
    name: 'Orquestador (Router LLM)',
    description: 'Analiza la intención del usuario y enruta a diferentes asistentes o ramas.',
    flow: {
      steps: [
        {
          id: 'intent_analysis',
          type: 'router',
          config: {
            routingMode: 'llm',
            model: 'llama-3.1-8b-instant',
            branches: [
              { id: 'sales', description: 'User wants to buy something or asks for prices' },
              { id: 'support', description: 'User has a problem or technical question' },
              { id: 'chitchat', description: 'Casual conversation or greeting' }
            ]
          },
          inputs: {
            user_message: '{{trigger.content}}'
          }
        },
        {
          id: 'sales_handler',
          type: 'llm',
          config: {
            model: 'llama-3.1-70b-versatile',
            systemPrompt: 'You are an expert sales assistant. Be persuasive and helpful.'
          },
          inputs: {
            user_message: '{{trigger.content}}'
          }
        },
        {
          id: 'support_handler',
          type: 'llm',
          config: {
            model: 'gpt-4o-mini',
            systemPrompt: 'You are technical support. Solve the user problem efficiently.'
          },
          inputs: {
            user_message: '{{trigger.content}}'
          }
        }
      ]
    }
  },
  {
    id: 'rag_qa',
    name: 'RAG Q&A (Búsqueda + Respuesta)',
    description: 'Busca información en bases de conocimiento y genera una respuesta.',
    flow: {
      steps: [
        {
          id: 'search',
          type: 'rag',
          config: {
            topK: 3,
            minScore: 0.5
          },
          inputs: {
            query: '{{trigger.content}}'
          }
        },
        {
          id: 'generate_answer',
          type: 'llm',
          config: {
            model: 'llama-3.1-8b-instant',
            systemPrompt: 'Answer the user question using ONLY the provided context.\n\nContext:\n{{steps.search.output.context}}'
          },
          inputs: {
            user_message: '{{trigger.content}}'
          }
        }
      ]
    }
  },
  {
    id: 'tool_execution',
    name: 'Ejecución de Herramienta',
    description: 'Extrae parámetros y ejecuta una herramienta específica.',
    flow: {
      steps: [
        {
          id: 'extract_params',
          type: 'llm',
          config: {
            model: 'llama-3.1-8b-instant',
            responseFormat: 'json',
            systemPrompt: 'Extract search parameters from user input. Return JSON with keys: location, price_max.'
          },
          inputs: {
            user_message: '{{trigger.content}}'
          }
        },
        {
          id: 'execute_search',
          type: 'tool',
          config: {
            tool: 'search_properties'
          },
          inputs: {
            location: '{{steps.extract_params.output.location}}',
            price_max: '{{steps.extract_params.output.price_max}}'
          }
        },
        {
          id: 'summarize',
          type: 'llm',
          config: {
            systemPrompt: 'Summarize the search results for the user.'
          },
          inputs: {
            results: '{{steps.execute_search.output}}'
          }
        }
      ]
    }
  }
];

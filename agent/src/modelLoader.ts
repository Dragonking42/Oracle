export type ModelLoader = {
  generate: (prompt: string) => Promise<string>;
  healthCheck: () => Promise<boolean>;
};

type OllamaGenerateResponse = {
  response?: string;
};

export function createModelLoader(baseUrl: string, model: string): ModelLoader {
  return {
    async generate(prompt: string): Promise<string> {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`ollama_generate_failed: ${response.status}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response?.trim() ?? "";
    },

    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/api/tags`);
        return response.ok;
      } catch {
        return false;
      }
    }
  };
}

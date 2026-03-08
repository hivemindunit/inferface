/**
 * Smoke test: Vite + React consuming @inferface/hooks and @inferface/components.
 * This file verifies that the packages can be imported and used in a standard
 * Vite + React 18 setup with ESM modules.
 */
import { useChat } from "@inferface/hooks";
import { ChatThread, PromptInput } from "@inferface/components";

export default function App() {
  const chat = useChat({
    api: "/api/chat",
    providerFormat: "openai",
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <ChatThread
        chat={chat}
        style={{ flex: 1 }}
      />
      <PromptInput
        onSubmit={(text) => chat.send(text)}
        isLoading={chat.isLoading}
        onStop={chat.abort}
      />
    </div>
  );
}

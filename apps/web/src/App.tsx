function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">FluxCore</h1>
        <p className="text-xl text-gray-600 mb-8">
          Sistema de Mensajería Universal Extensible
        </p>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
          <div className="mb-6">
            <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
              ✓ Hito 0 Completado
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Bootstrap del Monorepo
          </h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li>✓ Bun workspaces configurado</li>
            <li>✓ Turbo build orchestration</li>
            <li>✓ Package @fluxcore/types</li>
            <li>✓ Package @fluxcore/db</li>
            <li>✓ ESLint + Prettier</li>
            <li>✓ App API con Elysia</li>
            <li>✓ App Web con Vite + React</li>
          </ul>
          <div className="mt-8 text-sm text-gray-500">
            <p>Próximo: Hito 1 - Fundamentos de Identidad</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-72 max-w-lg flex-col items-center justify-center text-center">
      <div className="card w-full p-6">
        <h1 className="text-lg font-semibold text-gray-900">Não foi possível carregar esta tela</h1>
        <p className="mt-2 text-sm text-gray-500">Ocorreu um erro ao buscar os dados. Tente novamente; se persistir, contate o administrador.</p>
        <button type="button" className="btn-primary mt-5" onClick={() => reset()}>Tentar novamente</button>
      </div>
    </div>
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, model } = body

    if (!prompt || !model) {
      return Response.json({ message: "Prompt e Modelo são obrigatórios" }, { status: 400 })
    }

    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    }).catch(err => {
      console.error("Ollama connection error:", err)
      throw new Error("Não foi possível conectar ao Ollama. Verifique se ele está rodando na porta 11434.")
    })

    if (!res.ok) {
      const errorText = await res.text()
      try {
        const errorJson = JSON.parse(errorText)
        return Response.json(
          { message: `Erro no Ollama: ${errorJson.error || res.statusText}` },
          { status: res.status }
        )
      } catch {
        return Response.json(
          { message: `Erro no servidor Ollama (${res.status}): ${res.statusText}` },
          { status: res.status }
        )
      }
    }

    const data = await res.json()
    return Response.json({
      message: data.response || "Sem resposta do modelo",
    })
  } catch (err: any) {
    console.error("Chat API Error:", err)
    return Response.json(
      { message: err.message || "Erro ao consultar modelo." },
      { status: 500 }
    )
  }
}

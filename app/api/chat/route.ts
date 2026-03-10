export async function POST(req: Request) {
  try {
    const body = await req.json()

    const prompt = body.prompt
    const model = body.model

    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    })

    const data = await res.json()

    return Response.json({
      message: data.response || "Sem resposta",
    })
  } catch (err) {
    return Response.json(
      { message: "Erro ao consultar modelo" },
      { status: 500 }
    )
  }
}

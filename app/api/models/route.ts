export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/tags")

    const data = await res.json()

    const models =
      data?.models?.map((m: any) => m.name) || []

    return Response.json(models)

  } catch (error) {
    return Response.json([])
  }
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserFromRequest, unauthorized, badRequest } from "@/lib/api-helpers";

const VALID_APPLICATION_METHODS = ["oral", "injectable", "topical", "ophthalmic", "otic", "inhalation", "other"];
const VALID_DOSE_UNITS = ["comprimido", "cápsula", "ml", "mg", "mcg", "g", "gotas", "UI"];

const SYSTEM_PROMPT = `Você é um especialista em identificação de medicamentos veterinários e humanos.
Analise a imagem do medicamento ou de sua embalagem e extraia as informações visíveis.
Responda APENAS com um objeto JSON válido, sem texto adicional, markdown ou blocos de código.

Campos do JSON:
- name: nome comercial/marca do medicamento (string ou null)
- active_ingredient: princípio(s) ativo(s) (string ou null)
- manufacturer: fabricante ou laboratório (string ou null)
- dose_unit: unidade de dose — prefira uma das opções: comprimido, cápsula, ml, mg, mcg, g, gotas, UI. Se não se encaixar em nenhuma, use a unidade que aparecer na embalagem (string ou null)
- application_method: método de aplicação — deve ser exatamente um de: oral, injectable, topical, ophthalmic, otic, inhalation, other (string ou null)

Use null para campos que não puder determinar com certeza pela imagem.`;

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let imageData: string;
  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  try {
    const body = await req.json();
    if (!body.image_data || !body.media_type) return badRequest("image_data and media_type required");
    imageData = body.image_data;
    mediaType = body.media_type;
  } catch {
    return badRequest("Invalid request body");
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
            { type: "text", text: "Identifique este medicamento e retorne as informações em JSON." },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const parsed = JSON.parse(text);

    // Sanitize to known valid values where applicable
    if (parsed.application_method && !VALID_APPLICATION_METHODS.includes(parsed.application_method)) {
      parsed.application_method = "other";
    }
    // Keep dose_unit as-is (could be a custom unit not in presets)
    const knownUnit = VALID_DOSE_UNITS.find(
      (u) => u.toLowerCase() === (parsed.dose_unit ?? "").toLowerCase()
    );
    if (parsed.dose_unit && !knownUnit) {
      // leave as custom — front-end will treat it as a custom unit
      parsed.dose_unit_custom = true;
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: `Não foi possível identificar o medicamento: ${err.message}` }, { status: 422 });
  }
}

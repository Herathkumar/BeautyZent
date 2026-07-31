import { aiChatSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import {
  customerTools,
  mockAssistantReply,
  runTool,
  staffTools,
} from "@/lib/ai-tools";
import OpenAI from "openai";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const body = aiChatSchema.parse(await req.json());
    let storeId = body.storeId;

    if (body.role === "staff") {
      const user = await requireAuth(req, ["owner", "cashier", "staff"]);
      storeId = user.storeId;
    } else if (body.storeSlug) {
      const store = await prisma.store.findUnique({ where: { slug: body.storeSlug } });
      if (!store) {
        return jsonWithCors(req, { error: "Store not found" }, { status: 404 });
      }
      storeId = store.id;
    }

    if (!storeId) {
      return jsonWithCors(req, { error: "storeId or storeSlug required" }, { status: 400 });
    }

    if (body.pendingAction?.confirmed) {
      const result = await runTool(body.pendingAction.tool, body.pendingAction.args, {
        storeId,
        role: body.role,
        confirmed: true,
      });
      return jsonWithCors(req, {
        message: {
          role: "assistant",
          content: result.ok
            ? `Done. ${JSON.stringify(result.data)}`
            : `Failed: ${result.error}`,
        },
      });
    }

    const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      const mock = await mockAssistantReply(
        body.role,
        storeId,
        lastUser?.content ?? ""
      );
      return jsonWithCors(req, {
        message: { role: "assistant", content: mock.content },
        draftAction: mock.draftAction,
        mode: "mock",
      });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    });
    const tools = body.role === "staff" ? staffTools : customerTools;
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            body.role === "staff"
              ? "You are a retail POS assistant. Use tools for inventory and sales. Never invent stock numbers."
              : "You are a helpful store shopping assistant. Use tools for products, stock, orders, and store info.",
        },
        ...body.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      tools,
      tool_choice: "auto",
    });

    const msg = completion.choices[0]?.message;
    if (msg?.tool_calls?.length) {
      const call = msg.tool_calls[0];
      const args = JSON.parse(call.function.arguments || "{}");
      const result = await runTool(call.function.name, args, {
        storeId,
        role: body.role,
        confirmed: false,
      });
      if (result.requiresConfirmation) {
        return jsonWithCors(req, {
          message: {
            role: "assistant",
            content: String((result.data as { message?: string })?.message ?? "Confirm?"),
          },
          draftAction: result.draftAction,
          mode: "openai",
        });
      }
      return jsonWithCors(req, {
        message: {
          role: "assistant",
          content: `${msg.content ?? ""}\n\n${JSON.stringify(result.data, null, 2)}`.trim(),
        },
        mode: "openai",
      });
    }

    return jsonWithCors(req, {
      message: {
        role: "assistant",
        content: msg?.content ?? "I could not generate a reply.",
      },
      mode: "openai",
    });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "AI error" },
      { status }
    );
  }
}


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageBase64, roomContext } = await req.json();

        if (!imageBase64) {
            throw new Error("Missing imageBase64");
        }

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            throw new Error("Missing OPENROUTER_API_KEY configuration");
        }

        const systemPrompt = `You are an expert Frontend Engineer. Analyze this hand-drawn wireframe. Convert it into a clean, modern React component using Tailwind CSS utility classes. Ensure accessibility and a 'Gen Z' premium aesthetic. Return ONLY the code inside a markdown block.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: roomContext ? `Context about this design: ${roomContext}\n\nGenerate the React code:` : "Generate the React code for this wireframe:"
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageBase64 // Expecting data:image/jpeg;base64,...
                                }
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`OpenRouter Error: ${data.error.message}`);
        }

        const generatedText = data.choices?.[0]?.message?.content || "No code generated.";

        return new Response(JSON.stringify({ code: generatedText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

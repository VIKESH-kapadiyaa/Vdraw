

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            throw new Error("Invalid or missing JSON body");
        }

        const { imageBase64, roomContext } = body;

        if (!imageBase64 || typeof imageBase64 !== 'string') {
            throw new Error("Missing or invalid 'imageBase64' field");
        }

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            console.error("Missing OPENROUTER_API_KEY environment variable");
            throw new Error("Server configuration error");
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

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error("OpenRouter API Error:", response.status, errorText);
            throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
        }

        const data = await response.json().catch(() => null);

        if (!data) {
            throw new Error("Invalid JSON response from AI Provider");
        }

        if (data.error) {
            console.error("OpenRouter API Error:", data.error);
            throw new Error(`AI Service Error: ${data.error.message || 'Unknown error'}`);
        }

        const generatedText = data.choices?.[0]?.message?.content || "No code generated.";

        return new Response(JSON.stringify({ code: generatedText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 400, // Using 400 for bad requests, logic errors.
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

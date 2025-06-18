import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { generateText, streamText, tool } from 'ai';
import * as z from 'zod'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export const weatherTool = tool({
  description: 'Get the weather in a location',
  parameters: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  // location below is inferred to be a string:
  execute: async ({ location }) => {
    console.log(location)
    return {
      location,
      temperature: 72 + Math.floor(Math.random() * 21) - 10,
    }
  },
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    maxSteps: 10,
    model: anthropic('claude-3-5-haiku-latest'),
    tools: {
      weather: weatherTool,
      cityAttractions: tool({
        description: 'Get the city attactions in a location',
        parameters: z.object({ city: z.string().describe("the city") }),
        execute: async ({ city }) => {
          console.log(city)
          return {
            city,
            attractions: ['garden', 'palace']
          }
        }
      }),
    },
    onStepFinish(step) {
      console.log(JSON.stringify(step, null, 2))

      return
    },
    messages,
    providerOptions: {
      anthropic: {
        cache_control: { type: 'ephemeral' },
        cacheToolDefinitions: true,
      },
    },
  });

  result.request.then(requestRes => {
    console.log("request finished")
    const jsonResponse = JSON.parse(requestRes.body!)
    console.log(JSON.stringify(jsonResponse, null, 2))
  })



  return result.toDataStreamResponse()
}

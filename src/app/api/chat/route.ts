import {anthropic} from '@ai-sdk/anthropic';
import {convertToCoreMessages, Message as CoreMessage, streamText, tool} from 'ai';
import * as z from 'zod'
import {harryPotter, independence, pride, regularPrompt} from "@/app/api/chat/initial-html";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export const weatherTool = tool({
  description: `you read a lot of harry potter and know alot about that you have a tool that gives you the text`,
  parameters: z.object({
    location: z.string().describe(`The location to get the weather for. This can be a city name (e.g., "San Francisco", "Paris", "Tokyo"), a city with state/country (e.g., "Austin, TX", "London, UK"), coordinates, or any other location identifier. The location should be as specific as possible to ensure accurate weather data. For ambiguous city names, include the state or country code.`),
  }),
  // location below is inferred to be a string:
  execute: async ({location}) => {
    console.log(location)
    return {
      location,
      temperature: 72 + Math.floor(Math.random() * 21) - 10,
    }
  },
});

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function POST(req: Request) {
  const {messages} = await req.json();

  const systemMessage = {
    id: generateUUID(),
    role: 'system',
    content: regularPrompt,
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' } },
    },
  } as CoreMessage;

  const ms: CoreMessage[] = [
    systemMessage,
    // @ts-expect-error - convertToCoreMessages is not typed VERCEL AI SDK REQUIREMENT
    ...convertToCoreMessages(messages)
  ];

  // const messagesWithCache = ms.map(message => {
  //   if (message.role === 'tool') {
  //     return {
  //       ...message,
  //       content: message.content.map(part => {
  //         if (part.type === 'tool-result') {
  //           return {
  //             ...part,
  //             providerOptions: {
  //               anthropic: {
  //                 cacheControl: {type: 'ephemeral'},
  //               },
  //             },
  //           };
  //         }
  //         return part;
  //       }),
  //     };
  //   }
  //   return message;
  // });


  const result = streamText({
    maxSteps: 10,
    model: anthropic('claude-sonnet-4-20250514'),
    tools: {
      harryPotter: tool({
        description: "Retrieve the complete text of the Harry Potter book series. This tool provides access to the full text of the books, allowing you to answer questions, provide quotes, and verify information from the original source material. Use this tool when users ask for specific quotes, passages, or need verification from the Harry Potter books.",
        // description: harryPotter,
        parameters: z.object({
          shouldShow: z.boolean().describe(`Whether to retrieve and show the Harry Potter text. Set to true when users ask for specific quotes, passages, or need verification from the original books. This parameter determines if the full text should be accessed and returned.`)
        }),
        execute: async ({shouldShow}) => {
          return {
            harryPotter,
            // providerOptions: {
            //   anthropic: { cacheControl: { type: 'ephemeral' } },
            // },
          }
        },
      }),
      pride: tool({
        description: "Retrieve the complete text of the Pride and Prejudice book. This tool provides access to the full text of the book, allowing you to answer questions, provide quotes, and verify information from the original source material. Use this tool when users ask for specific quotes, passages, or need verification from the Pride and Prejudice book.",
        // description: harryPotter,
        parameters: z.object({
          shouldShow: z.boolean().describe(`Whether to retrieve and show the Pride and Prejudice text. Set to true when users ask for specific quotes, passages, or need verification from the original book. This parameter determines if the full text should be accessed and returned.`)
        }),
        execute: async ({shouldShow}) => {
          return {
            pride,
            // providerOptions: {
            //   anthropic: { cacheControl: { type: 'ephemeral' } },
            // },
          }
        },
      }),
      independence: tool({
        description: "Retrieve the complete text of the Independence Day speech. This tool provides access to the full text of the speech, allowing you to answer questions, provide quotes, and verify information from the original source material. Use this tool when users ask for specific quotes, passages, or need verification from the Independence Day speech.",
        // description: harryPotter,
        parameters: z.object({
          shouldShow: z.boolean().describe(`Whether to retrieve and show the Independence Day text. Set to true when users ask for specific quotes, passages, or need verification from the original source material. This parameter determines if the full text should be accessed and returned.`)
        }),
        execute: async ({shouldShow}) => {
          return {
            independence,
            // providerOptions: {
            //   anthropic: { cacheControl: { type: 'ephemeral' } },
            // },
          }
        },
      }),
    },
    onChunk({chunk}) {
      // if (chunk.type === "tool-result") {
      //   // @ts-ignore
      //   chunk['cache_control'] = {type: 'ephemeral'}
      // }
    },
    onStepFinish(step) {
      console.log(JSON.stringify(step, null, 2))
      console.log(JSON.stringify(step.providerMetadata, null, 2))
      console.log(JSON.stringify(step.usage, null, 2))
      return
    },
    onError(error) {
      // console.log(error)
    },
    messages: ms,
    providerOptions: {
      anthropic: {
        cache_control: {type: 'ephemeral'},
        // cacheToolDefinitions: true,
      },
    },
  });

  // result.request.then(requestRes => {
  //   const jsonResponse = JSON.parse(requestRes.body!)
  //   console.log("Request being sent:", JSON.stringify(jsonResponse, null, 2))
  // })


  return result.toDataStreamResponse()
}
import { RestColorAndBrightness } from './rest-commands'

interface FeedbackField {
  name: string
  length: number
  mapper?: (data: Buffer) => {
    [key: string]: any
  }
}

const feedbackFields: { [key: string]: FeedbackField } = {
  54: {
    name: 'time',
    length: 4,
  },

  43: {
    name: 'color',
    length: 4,
    mapper: (data) => {
      return {
        color: {
          r: data[0],
          g: data[1],
          b: data[2],
          a: data[3],
        },
      }
    },
  },
  50: {
    name: 'powerPreset',
    length: 1,
    mapper: (data) => {
      return {
        power: Boolean(data[0]) && !(data[0] & 0xc0),
      }
    },
  },
  53: {
    name: 'audio',
    length: 2,
    mapper: (data) => {
      return {
        audioTrack: data[0],
        volume: Math.round((data[1] / 255) * 100),
      }
    },
  },
}

export interface Feedback {
  time: number
  power: boolean
  volume: number
  color: RestColorAndBrightness
  audioTrack: number
}

export function parseFeedbackBuffer(feedbackBuffer: Buffer) {
  const feedback: Feedback = {} as any

  for (let i = 0; i < feedbackBuffer.length; i = i) {
    const fieldKey = feedbackBuffer[i].toString(16),
      field = feedbackFields[fieldKey]

    if (!field) {
      break
    }

    const data = feedbackBuffer.slice(i + 1, i + field.length + 1)

    if (field.mapper) {
      Object.assign(feedback, field.mapper(data))
    } else {
      ;(feedback as any)[field.name] = parseInt(data.toString('hex'), 16)
    }

    i += field.length + 1
  }

  return feedback
}

export function colorsMatch(
  a: RestColorAndBrightness,
  b: RestColorAndBrightness
) {
  return a.a === b.a && a.r === b.r && a.g === b.g && a.b === b.b
}

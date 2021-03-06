import { ApiConfig } from './api'

export interface Baby {
  id: number
  createDate: string
  updateDate: string
  name: string
  birthDate: string | null
  dueDate: string | null
  birthWeight: number | null
  birthLength: number | null
  gender: 'MALE' | 'FEMALE'
  age: string
  stage: number
  lessThanTwoWeeksOld: boolean
}

export interface Member {
  id: number
  createDate: string
  updateDate: string
  active: boolean
  email: string
  babies: Baby[]
  defaultUnitOfMeasure: 'imperial' | string
  appType: 'iOS' | string
  firstName: string
  lastName: string | null
  signupSource: 'rest' | string
  timezone: string
  timeZoneAdjust: number
  stage: number
}

export interface LoginResponse {
  payload: Member
  sync: number
  token: string
}

export interface MemberResponse {
  products: ('rest' | 'restPlus')[]
  debugLevel: string
  member: Member
}

export interface IotDeviceInfo {
  id: number
  createDate: string
  updateDate: string
  macAddress: string
  owner: boolean
  name: string
  hardwareVersion: string
  product: string
  thingName: string
  email: string
  memberId: number
}

export interface IotTokenResponse {
  endpoint: string
  identityId: string
  region: string
  cognitoPoolId: string
  token: string
}

export interface IotCredentialsResponse {
  Credentials: {
    AccessKeyId: string
    Expiration: number
    SecretKey: string
    SessionToken: string
  }
  IdentityId: string
}

// eslint-disable-next-line no-shadow
export const enum AudioTrack {
  None = 0,
  Stream = 2,
  PinkNoise = 3,
  Dryer = 4,
  Ocean = 5,
  Wind = 6,
  Rain = 7,
  Bird = 9,
  Crickets = 10,
  Brahms = 11,
  Twinkle = 13,
  RockABye = 14,
}
export const audioTracks = [
  AudioTrack.None,
  AudioTrack.Stream,
  AudioTrack.PinkNoise,
  AudioTrack.Dryer,
  AudioTrack.Ocean,
  AudioTrack.Wind,
  AudioTrack.Rain,
  AudioTrack.Bird,
  AudioTrack.Crickets,
  AudioTrack.Brahms,
  AudioTrack.Twinkle,
  AudioTrack.RockABye,
]

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface RestPlusColor extends RgbColor {
  i: number // intensity, max 65535
  R: boolean // rainbow if true, rgb 0
  W: boolean // white if true, rgb 0
}

// NOTE: rgb are used for Rest, RW used for Rest+
export const SpecialColor = {
  Rainbow: {
    r: 254,
    g: 254,
    b: 254,
    R: true,
    W: false,
  },
  White: {
    r: 255,
    g: 255,
    b: 255,
    R: false,
    W: true,
  },
}

interface Audio {
  t: AudioTrack
  v: number // volume, max 65535
}

export interface RestPlusState {
  owned: boolean
  a: Audio
  activePresetIndex: number
  c: RestPlusColor
  clock: { b: number; f: number }
  isFactory: boolean
  isPowered: boolean
  lucky: number
  stream: {
    LTP: boolean
    LIP?: string
    LP?: number
    PIP: string
    PP: number
    PTL: boolean
    v: number
  }
  timer: { d: number; s: string }
  timezone: string
  SDIO: string // 1.8V
  PSRAM: {
    ID: string
    HI: string
    EID: string
    week: string
  }
  FLASH: { ID: string }
  memTest: {
    testsPass: number
    testsFail: number
    wordsChecked: number
    wordsFail: number
    failAddr: string
  }

  LDR: 'OK' | string
  activeProgramIndex: number
  rF: {
    v: string
    i: boolean
    u: string
  }
  bM: { b: number; d: number }
  date: string
  deviceInfo: {
    b: number // battery
    f: string // firmware version
    fR: number
  }
  name: string
  isPaused: false
  presets: {
    [id: number]: {
      a: Audio
      c: RestPlusColor
      f: number
    }
  }
  programs: {
    [id: number]: {
      a: Audio
      bm: { b: number; d: number }
      c: RestPlusColor
      d: string
      D: number
      U: number
      f: number
      n: string
      P: boolean
      p: number
    }
  }
  connected: true
  rssi: -42
  LWTP: false
  debug: 0
}

// eslint-disable-next-line no-shadow
export const enum RestMiniAudioTrack {
  None = 0,
  Heartbeat = 10124,
  Water = 10125,
  WhiteNoise = 10126,
  Dryer = 10127,
  Ocean = 10128,
  Wind = 10129,
  Rain = 10130,
  Birds = 10131,
}
export const restMiniAudioTracks = [
  RestMiniAudioTrack.None,
  RestMiniAudioTrack.WhiteNoise,
  RestMiniAudioTrack.Ocean,
  RestMiniAudioTrack.Rain,
  RestMiniAudioTrack.Water,
  RestMiniAudioTrack.Wind,
  RestMiniAudioTrack.Birds,
  RestMiniAudioTrack.Dryer,
  RestMiniAudioTrack.Heartbeat,
]

export interface RestMiniSound {
  id: number
  mute: boolean
  url: string
  until: 'indefinite' | 'duration' | string
  duration: number
  v: number
}

export interface RestMiniState {
  env: 'prod' | string
  current: {
    playing: 'none' | 'remote' | string
    step: number
    sound: RestMiniSound
  }
  playNext: {
    enabled: false
    sound: RestMiniSound & {
      ignoreVolume: false
    }
  }
  timer: { s: string; d: number }
  streaming: { status: 'none' | string }
  timezone: string
  rF: {
    v: string
    i: boolean
    u: string
  }
  deviceInfo: { f: string; fR: number; hwVersion: string }
  lucky: number
  LDR: 'OK' | string
  LWTP: boolean
  debug: number
  logging: number
  owned: boolean
  lastReset: 'PowerOn' | string
  REX: { lock: number; key: number; command: 'none' | string }
  connected: boolean
  rssi: number
}

interface RestLightConfig {
  name: string
  macAddress: string
}

export interface HatchBabyPlatformOptions extends ApiConfig {
  restLights?: RestLightConfig[]
}

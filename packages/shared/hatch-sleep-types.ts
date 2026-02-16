export const Product = {
  rest: 'rest',
  riot: 'riot',
  riotPlus: 'riotPlus',
  restPlus: 'restPlus',
  restMini: 'restMini',
  restore: 'restore',
  restoreIot: 'restoreIot',
  restoreV4: 'restoreV4',
  alexa: 'alexa',
  grow: 'grow',
  answeredReader: 'answeredReader',
} as const

// eslint-disable-next-line no-redeclare
export type Product = (typeof Product)[keyof typeof Product]

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

export interface LoginFailureResponse {
  status: 'failure'
  message: string
  payload: null
  sync: null
  errorCode: string
}

export interface MemberResponse {
  products: Product[]
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
  product: Product
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

export const AudioTrack = {
  None: 0,
  Stream: 2,
  PinkNoise: 3,
  Dryer: 4,
  Ocean: 5,
  Wind: 6,
  Rain: 7,
  Bird: 9,
  Crickets: 10,
  Brahms: 11,
  Twinkle: 13,
  RockABye: 14,
} as const

// eslint-disable-next-line no-redeclare
export type AudioTrack = (typeof AudioTrack)[keyof typeof AudioTrack]

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

export interface IotSound {
  id: number
  mute: boolean
  url: string
  until: 'indefinite' | 'duration' | string
  duration: number
  v: number
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
  isPaused: boolean
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
  rssi: number
  LWTP: boolean
  debug: number
}

export interface RestIotState {
  env: 'prod' | string
  alarmsDisabled: boolean
  nightlightOn: boolean
  nightlightIntensity: number
  toddlerLockOn: boolean
  snoozeDuration: 540
  current: {
    srId: number
    playing: 'none' | 'remote' | 'routine' | string
    step: number
    paused: boolean
    color: {
      i: number
      id: number
      r: number
      g: number
      b: number
      w: number
      duration: number
      until: 'indefinite'
    }
    sound: IotSound
  }
  dataVersion: string
  sleepScene: {
    srId: number
    enabled: boolean
  }
  timer: { s: string; d: number }
  timezone: string
  rF: {
    v: string
    i: boolean
    u: string
  }
  deviceInfo: { f: string; fR: number; hwVersion: string }
  clock: {
    i: number
    turnOffAt: string
    turnOnAt: string
    flags: number
    turnOffMode: 'never' | string
  }
  toddlerLock: {
    turnOffAt: string
    turnOnAt: string
    turnOnMode: 'never' | string
  }
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
  streaming: { status: 'none' | string }
}

export interface RestIotRoutine {
  id: number
  macAddress: string
  name: string
  type: 'favorite' | 'sleep' | 'wake' | 'flex'
  active: boolean
  enabled: boolean
  displayOrder: number
  sleepScene: boolean
  followBySleepScene: boolean
  button0: boolean // true if this routine is available on touch ring
  startTime: null | string
  endTime: null | string
  daysOfWeek: null | any
  steps: any[]
}

export interface RestoreState {
  alarmsDisabled: boolean
  snoozeDuration: number
  env: 'prod' | string
  color: {
    id: number
    i: number
    enabled: boolean
  }
  sound: {
    id: number
    v: number
    enabled: boolean
  }
  deviceDefaults: {
    colorId: number
    i: number
    soundId: number
    v: number
  }
  restoreClock: {
    i: number
    turnOffAt: string
    turnOnAt: string
    flags: number
    turnOffMode: 'never' | string
  }
  content: {
    playing: 'none' | 'routine' | 'remote'
    startTime: number
    paused: boolean
    pausedAt: number
    offset: number
    step: number
    routineId: number
    adhocId: number
    alarmId: number
    alarmIds: number[]
    requested: {
      routine: {
        id: number
        status: 'success' | string
        reason: 'ok' | string
      }
      adhoc: {
        id: number
        status: 'unknown' | string
        reason: 'none' | string
      }
      alarms: {
        ids: number[]
        status: 'success' | string
        reason: 'ok' | string
      }
    }
  }
  LWTP: boolean
  timezone: string
  rF: {
    v: string
    i: true
    u: string
  }
  deviceInfo: {
    f: string
    fR: number
    hwVersion: string
  }
  LDR: 'OK' | string
  lucky: number
  SDIO: string
  PSRAM: {
    ID: string
    HI: string
    EID: string
    week: string
  }
  FLASH: {
    ID: string
  }
  memTest: {
    testsPass: number
    testsFail: number
    wordsChecked: number
    wordsFail: number
    failAddr: string
  }
  debug: number
  logging: number
  owned: boolean
  connected: boolean
  rssi: -44
  alarmDuration: 3600
  alarmRampDuration: 0
  tapDwell: 0.5
  headphones: {
    autoConnect: boolean
    stateRequest: 'unknown' | string
    requestedMacAddress: string
    requestedHPName: string
    requestedPin: string
    stateResult: 'unknown' | string
    connectedMacAddress: string
    connectedHPName: string
  }
  SDContent: {
    releaseDate: string
    hashType: string
    hashCode: string
  }
  REX: {
    lock: number
    key: number
    command: 'none' | string
  }
  lastReset: string
  encryption: number
}

export const RestMiniAudioTrack = {
  None: 0,
  Heartbeat: 10124,
  Water: 10125,
  WhiteNoise: 10126,
  Dryer: 10127,
  Ocean: 10128,
  Wind: 10129,
  Rain: 10130,
  Birds: 10131,
} as const

// eslint-disable-next-line no-redeclare
export type RestMiniAudioTrack =
  (typeof RestMiniAudioTrack)[keyof typeof RestMiniAudioTrack]

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

export interface RestMiniState {
  env: 'prod' | string
  current: {
    playing: 'none' | 'remote' | string
    step: number
    sound: IotSound
  }
  playNext: {
    enabled: boolean
    sound: IotSound & {
      ignoreVolume: boolean
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

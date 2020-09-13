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

export interface RestPlusInfo {
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

export interface Color {
  r: number
  g: number
  b: number
  i: number // intensity, max 65535
  R: boolean // rainbow if true, others 0
  W: boolean // white if true, others 0
}

interface Audio {
  t: AudioTrack
  v: number // volume, max 65535
}

export interface LightState {
  owned: boolean
  a: Audio
  activePresetIndex: number
  c: Color
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
      c: Color
      f: number
    }
  }
  programs: {
    [id: number]: {
      a: Audio
      bm: { b: number; d: number }
      c: Color
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

export interface AwsIotStatus {
  state: {
    desired?: Partial<LightState>
  }
}

export type Wax = 'oxblood' | 'forest' | 'ink' | 'mustard' | 'plum' | 'soot';
export type Plume = 'tawny' | 'ash' | 'umber' | 'sand' | 'white' | 'dark' | 'russet' | 'slate';
export type Eye = 'amber' | 'gold' | 'ember';

export interface Profile {
  id: string;
  name: string;
  monogram: string;
  wax: Wax;
  mixins: string[];
  edge: 'uneven' | 'clean';
  mark: string | null;
  plume: Plume;
  eye: Eye;
  owl_name: string;
  tz: string;
  quick_flights: boolean;
  last_lat: number | null;
  last_lon: number | null;
  last_place: string | null;
  last_seen_at: string | null;
  onboarded: boolean;
}

export interface FriendSettings {
  owner: string;
  friend: string;
  post_day: number;
  auto_post: boolean;
  wish_1111: boolean;
  since: string;
}

export interface Friend {
  profile: Profile;
  mine: FriendSettings;       // my settings for this friend
  theirs?: FriendSettings;    // their settings for me (wish_1111 must be on both)
}

export interface Scrap {
  id?: string;
  type: 'line' | 'photo' | 'question' | 'voice';
  text: string | null;
  media_path: string | null;
  created_at?: string;
}

export interface WordTiming { word: string; start: number; end: number }

export interface Letter {
  id: string;
  sender: string;
  recipient: string;
  kind: 'letter' | 'bundle';
  body: string;
  question: string | null;
  answers: { question: string; answer: string; letter_id: string }[] | null;
  stamp: string;
  photo_path: string | null;
  photo_caption: string | null;
  audio_path: string | null;
  video_path: string | null;
  transcript: WordTiming[] | null;
  enchanted: boolean;
  scraps: Scrap[] | null;
  from_lat: number | null; from_lon: number | null; from_place: string | null;
  to_lat: number | null; to_lon: number | null; to_place: string | null;
  distance_km: number | null;
  sent_at: string;
  arrive_at: string;
  opened_at: string | null;
  place: 'wall' | 'trunk' | null;
}

export interface Incoming {
  id: string; sender: string; sent_at: string; arrive_at: string;
  from_lat: number | null; from_lon: number | null; to_lat: number | null; to_lon: number | null;
}

export interface CustomStamp {
  id: string; image_path: string; owner: string; made_by: string | null; from_user: string | null;
  cutter: 'classic' | 'square' | 'wide' | 'oval'; caption: string | null;
  status: 'mine' | 'flying' | 'collected'; letter_id: string | null;
  postmark_place: string | null; postmark_at: string | null; collected_at: string | null; created_at: string;
}

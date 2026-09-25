import {
  Cpu,
  Globe2,
  Instagram,
  Linkedin,
  Play,
  Shield,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export type PresenceLink = {
  label: string;
  href: string;
  display: string;
  hue: string;
  Icon: LucideIcon;
};

/** Same destinations as the Biz Kimiz “Bağlantılar” block. */
export const PRESENCE_LINKS: PresenceLink[] = [
  {
    label: "Oppy",
    href: "https://oppy.dbrain.tech",
    display: "oppy.dbrain.tech",
    hue: "#111827",
    Icon: Shield,
  },
  {
    label: "LLMRadar",
    href: "https://llmradar.planetai9.com",
    display: "llmradar.planetai9.com",
    hue: "#1D4ED8",
    Icon: Globe2,
  },
  {
    label: "Digital Brain",
    href: "https://dbrain.tech",
    display: "dbrain.tech",
    hue: "#7C3AED",
    Icon: Cpu,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@planetai9",
    display: "youtube.com/@planetai9",
    hue: "#FF0000",
    Icon: Youtube,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/showcase/planetai9media",
    display: "linkedin.com/showcase/planetai9media",
    hue: "#0A66C2",
    Icon: Linkedin,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/planetai9media",
    display: "instagram.com/planetai9media",
    hue: "#E4405F",
    Icon: Instagram,
  },
  {
    label: "Spotify",
    href: "https://open.spotify.com/show/033ICMyCiAQh4Ynsx9vkg5",
    display: "open.spotify.com/show/033ICMyCiAQh4Ynsx9vkg5",
    hue: "#1DB954",
    Icon: Play,
  },
];

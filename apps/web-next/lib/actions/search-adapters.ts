"use server";

import { searchArtists } from "@/lib/queries/artists";
import { searchProductions } from "@/lib/queries/productions";
import { searchSongs } from "@/lib/queries/songs";

interface CreatableOption {
  id: number;
  label: string;
}

/** Adapts {@link searchArtists} to the `{id, label}` shape creatable fields expect. */
export async function searchArtistOptions(
  query: string,
): Promise<CreatableOption[]> {
  const results = await searchArtists(query);
  return results.map((artist) => ({ id: artist.id, label: artist.name }));
}

/** Adapts {@link searchProductions} to the `{id, label}` shape creatable fields expect. */
export async function searchProductionOptions(
  query: string,
): Promise<CreatableOption[]> {
  const results = await searchProductions(query);
  return results.map((production) => ({
    id: production.id,
    label: `${production.name} (${production.releaseYear})`,
  }));
}

/** Adapts {@link searchSongs} to the `{id, label}` shape the "cover of" picker expects. */
export async function searchCoverSongOptions(
  query: string,
): Promise<CreatableOption[]> {
  const results = await searchSongs(query);
  return results.map((song) => ({
    id: song.id,
    label: `${song.title} — ${song.artist.name}`,
  }));
}

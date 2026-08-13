import type { ArchetypeConfig } from "./archetype.js";

// 14 arquétipos do OpenReels (MIT), reaproveitados sem mudança.
import animeIllustration from "./archetypes/anime-illustration.json" with { type: "json" };
import boldIllustration from "./archetypes/bold-illustration.json" with { type: "json" };
import cinematicDocumentary from "./archetypes/cinematic-documentary.json" with { type: "json" };
import comicBook from "./archetypes/comic-book.json" with { type: "json" };
import editorialCaricature from "./archetypes/editorial-caricature.json" with { type: "json" };
import gothicFantasy from "./archetypes/gothic-fantasy.json" with { type: "json" };
import infographic from "./archetypes/infographic.json" with { type: "json" };
import moodyCinematic from "./archetypes/moody-cinematic.json" with { type: "json" };
import pastoralWatercolor from "./archetypes/pastoral-watercolor.json" with { type: "json" };
import studioRealism from "./archetypes/studio-realism.json" with { type: "json" };
import surrealDreamscape from "./archetypes/surreal-dreamscape.json" with { type: "json" };
import vintageSnapshot from "./archetypes/vintage-snapshot.json" with { type: "json" };
import warmEditorial from "./archetypes/warm-editorial.json" with { type: "json" };
import warmNarrative from "./archetypes/warm-narrative.json" with { type: "json" };

// 5 arquétipos novos Click.Play (infantil/educativo/divertido) — docs/IMPLEMENTATION-PLAN.md §0.1.
import kidsCartoon from "./archetypes/kids-cartoon.json" with { type: "json" };
import storybookPicturebook from "./archetypes/storybook-picturebook.json" with { type: "json" };
import eduExplainer from "./archetypes/edu-explainer.json" with { type: "json" };
import claymationPlayful from "./archetypes/claymation-playful.json" with { type: "json" };
import musicalSingalong from "./archetypes/musical-singalong.json" with { type: "json" };

const ARCHETYPES: Record<string, ArchetypeConfig> = {
  editorial_caricature: editorialCaricature as ArchetypeConfig,
  warm_narrative: warmNarrative as ArchetypeConfig,
  studio_realism: studioRealism as ArchetypeConfig,
  infographic: infographic as ArchetypeConfig,
  anime_illustration: animeIllustration as ArchetypeConfig,
  pastoral_watercolor: pastoralWatercolor as ArchetypeConfig,
  comic_book: comicBook as ArchetypeConfig,
  gothic_fantasy: gothicFantasy as ArchetypeConfig,
  vintage_snapshot: vintageSnapshot as ArchetypeConfig,
  surreal_dreamscape: surrealDreamscape as ArchetypeConfig,
  warm_editorial: warmEditorial as ArchetypeConfig,
  cinematic_documentary: cinematicDocumentary as ArchetypeConfig,
  moody_cinematic: moodyCinematic as ArchetypeConfig,
  bold_illustration: boldIllustration as ArchetypeConfig,
  kids_cartoon: kidsCartoon as ArchetypeConfig,
  storybook_picturebook: storybookPicturebook as ArchetypeConfig,
  edu_explainer: eduExplainer as ArchetypeConfig,
  claymation_playful: claymationPlayful as ArchetypeConfig,
  musical_singalong: musicalSingalong as ArchetypeConfig,
};

export function getArchetype(name: string): ArchetypeConfig {
  const config = ARCHETYPES[name];
  if (!config) {
    throw new Error(`Unknown archetype: ${name}. Available: ${Object.keys(ARCHETYPES).join(", ")}`);
  }
  return config;
}

export function listArchetypes(): string[] {
  return Object.keys(ARCHETYPES);
}

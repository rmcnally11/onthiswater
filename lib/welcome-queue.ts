export type WelcomeTask = () => Promise<void>;

/** A failed welcome is logged. It must not reject the request that already returned. */
export async function guardWelcome(task: WelcomeTask) {
  try {
    await task();
  } catch (error) {
    console.error("Welcome mail did not send.", error);
  }
}

export function enqueueWelcome(schedule: (task: WelcomeTask) => void, task: WelcomeTask) {
  schedule(() => guardWelcome(task));
}

export function subscribeNote(coasts: string[], via: "airtable" | "local") {
  const listed = `You're on the list for ${coasts.join(", ")}. Welcome notes are on the way.`;
  if (via === "local") {
    return `Saved on this machine only. Production still needs AIRTABLE_API_KEY on Vercel — see AIRTABLE.md. ${listed}`;
  }
  return listed;
}

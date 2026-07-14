import { safeApiFetcher } from "@/api-client/common";
import { Journal } from "@/api-shared/journal";

export async function apiGetJournal(date: string): Promise<Journal> {
  const data = await safeApiFetcher(`/api/journal?date=${date}`);
  return data as Journal;
}

export async function apiUpdateJournal(journal: Partial<Journal>): Promise<Journal> {
  const data = await safeApiFetcher('/api/journal', {
    method: 'POST',
    body: JSON.stringify(journal),
  });
  return data as Journal;
}
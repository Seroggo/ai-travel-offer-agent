import type { SpikeTour } from "./types.ts";

export type TravelOffer = {
  agent_summary: string;
  client_message: string;
};

export function buildOffer(tours: SpikeTour[]): TravelOffer {
  if (tours.length === 0) {
    return {
      agent_summary: "Подходящие варианты не найдены.",
      client_message: "",
    };
  }

  const first = tours[0];
  const lines: string[] = ["Подобрал варианты:"];

  for (let i = 0; i < tours.length; i++) {
    const t = tours[i];
    lines.push("");
    lines.push(`${i + 1}. ${t.hotel_name}`);
    lines.push(`${t.resort}, ${t.hotel_category}`);
    lines.push(`Вылет: ${t.departure_date}, ${t.nights} ночей`);
    lines.push(`Питание: ${t.meal}`);
    lines.push(`Стоимость: ${t.price} ${t.currency}`);
  }

  lines.push("");
  lines.push(
    "Цены и наличие могут измениться. Перед бронированием необходимо повторное подтверждение.",
  );

  const agentSummary = `Запрос обработан. Найдено ${tours.length} подходящих вариантов.\n\n` +
    `Первым поставлен ${first.hotel_name}, потому что он лучше остальных соответствует заданным ограничениям по бюджету, питанию и рейтингу.\n\n` +
    "Перед отправкой клиенту необходимо подтвердить актуальность цены и наличие мест.";

  return {
    agent_summary: agentSummary,
    client_message: lines.join("\n"),
  };
}

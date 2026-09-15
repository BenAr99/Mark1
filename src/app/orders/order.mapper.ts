import { field, isRecord, requireString, stringField } from '../core/api';
import {
  FileKind,
  Order,
  OrderEvent,
  OrderFile,
  ORDER_FLOW,
  OrderStatus,
  Person,
  Role,
} from './order.model';

/** Участник справочника: профиль плюс текущая загрузка. */
export interface PersonOption extends Person {
  /** Сколько заказов у человека сейчас в работе. */
  load: number;
}

export function parseOrderList(raw: unknown): Order[] {
  return asArray(raw, 'GET /orders').map((item, index) =>
    parseOrder(item, `GET /orders[${index}]`),
  );
}

/** Справочники людей устроены одинаково — различает их только роль. */
export function parsePeople(raw: unknown, role: Role, path: string): PersonOption[] {
  return asArray(raw, path).map((item, index) => {
    const where = `${path}[${index}]`;
    const record = asRecord(item, where);

    return { ...parsePerson(record, role, where), load: numberField(record, 'load') };
  });
}

export function parseOrder(raw: unknown, where = 'заказ'): Order {
  const order = asRecord(raw, where);

  const patientName = requireString(order, 'patientName', where);
  const teeth = asArray(field(order, 'teeth'), `${where} · teeth`)
    .map((tooth) => Number(tooth))
    .filter((tooth) => Number.isFinite(tooth));
  const workType = requireString(order, 'workType', where);

  return {
    id: requireString(order, 'id', where),
    patientName,
    patientShort: stringField(order, 'patientShort') || shortenName(patientName),
    teeth,
    workType,
    workSummary: stringField(order, 'workSummary') || `${workType}, ${teeth.length} ед.`,
    shade: stringField(order, 'shade'),
    dueDate: stringField(order, 'dueDate'),
    comment: stringField(order, 'comment'),
    files: parseFiles(field(order, 'files')),
    doctor: parsePerson(field(order, 'doctor'), 'doctor', `${where} · doctor`),
    technician: parsePerson(field(order, 'technician'), 'technician', `${where} · technician`),
    status: parseStatus(field(order, 'status'), where),
    history: parseHistory(field(order, 'history')),
    unread: numberField(order, 'unread'),
  };
}

/**
 * Короткие подписи бэкенд слать не обязан — это чистое оформление,
 * и восстановить их из полного имени дешевле, чем держать в контракте.
 */
export function parsePerson(raw: unknown, role: Role, where: string): Person {
  const person = asRecord(raw, where);
  const name = requireString(person, 'name', where);
  const org = stringField(person, 'org');

  return {
    id: requireString(person, 'id', where),
    role,
    name,
    shortName: stringField(person, 'shortName') || shortPersonName(name, role),
    org,
    orgShort: stringField(person, 'orgShort') || shortOrg(org),
    telegram: stringField(person, 'telegram').replace(/^@/, ''),
  };
}

/** «Иванов Артём Петрович» → «Иванов А. П.» */
export function shortenName(full: string): string {
  const [surname, ...rest] = full.split(/\s+/).filter(Boolean);
  if (!surname) return full;

  const initials = rest.map((part) => `${part[0].toUpperCase()}.`).join(' ');

  return initials ? `${surname} ${initials}` : surname;
}

/** «Рустам Ахметов» → «Р. Ахметов»; у врача вместо инициала — «д-р». */
function shortPersonName(full: string, role: Role): string {
  const parts = full.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  if (!surname) return full;
  if (role === 'doctor') return `д-р ${surname}`;

  return parts.length > 1 ? `${parts[0][0].toUpperCase()}. ${surname}` : surname;
}

/** «Лаборатория «ОртоЛаб»» → «ОртоЛаб». */
function shortOrg(org: string): string {
  return org.match(/[«"]([^»"]+)[»"]/)?.[1] ?? org;
}

function parseStatus(raw: unknown, where: string): OrderStatus {
  const status = ORDER_FLOW.find((candidate) => candidate === raw);
  if (!status) throw new Error(`${where}: неизвестный статус «${String(raw)}»`);

  return status;
}

function parseHistory(raw: unknown): OrderEvent[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isRecord)
    .map((entry) => ({
      status: ORDER_FLOW.find((candidate) => candidate === field(entry, 'status')),
      at: stringField(entry, 'at'),
    }))
    .filter((entry): entry is OrderEvent => !!entry.status);
}

function parseFiles(raw: unknown): OrderFile[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter(isRecord).map((file, index) => {
    const name = stringField(file, 'name');

    return {
      id: stringField(file, 'id') || `${index}`,
      name,
      kind: parseFileKind(stringField(file, 'kind') || name),
    };
  });
}

/** Тип вложения бэкенд может не присылать — тогда определяем по расширению. */
export function parseFileKind(value: string): FileKind {
  if (value === 'stl' || value === 'image' || value === 'other') return value;

  const ext = value.split('.').pop()?.toLowerCase();

  if (ext === 'stl' || ext === 'ply' || ext === 'obj') return 'stl';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'heic') return 'image';

  return 'other';
}

function numberField(raw: Record<string, unknown>, name: string): number {
  const value = Number(field(raw, name));

  return Number.isFinite(value) ? value : 0;
}

function asRecord(raw: unknown, where: string): Record<string, unknown> {
  if (!isRecord(raw)) throw new Error(`${where}: ожидался объект`);

  return raw;
}

function asArray(raw: unknown, where: string): unknown[] {
  if (!Array.isArray(raw)) throw new Error(`${where}: ожидался массив`);

  return raw;
}

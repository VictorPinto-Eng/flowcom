export interface CardType {
  id: string;
  seqid?: string;
  title: string;
  description: string;
  dtatv?: Date | string | null;
  previsto?: Date | string | null;
  dtcon?: Date | string | null;
  createdAt?: Date | string;
  taskuser_seqid?: bigint | number | null;
  task_user?: {
    id: string;
    seqid: bigint | number;
    name: string;
    email?: string;
  } | null;
  user_seqid?: bigint | number | null;
  user?: {
    id: string;
    seqid: bigint | number;
    name: string;
    email?: string;
  } | null;
}

export interface ColumnType {
  id: string;
  title: string;
  cards: CardType[];
}

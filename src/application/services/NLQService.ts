// src/application/services/NLQService.ts

export class NLQService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(question: string, aggregates: any, userId: string): Promise<{ answer: string }> {
    return { answer: 'Fitur AI dinonaktifkan sementara demi alasan keamanan (Audit Forensik v1.3.5).' };
  }
}

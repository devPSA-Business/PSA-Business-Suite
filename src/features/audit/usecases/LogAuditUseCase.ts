/**
 * @ai_context: UseCase catat audit log — setiap aksi kritis harus melewati ini
 * @business_rule: Audit log immutable. Hash chained untuk deteksi tamper.
 * @security_tier: CRITICAL
 */
import { IUnitOfWork } from '@application/core/IUnitOfWork';

export class LogAuditUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(action: string, user: string, details: string): Promise<void> {
    await this.unitOfWork.execute(async () => {
      await this.unitOfWork.registerAudit(action, user, details);
    }, ['audit_logs']);
  }
}

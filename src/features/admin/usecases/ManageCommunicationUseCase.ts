import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IAppointmentRepository } from '@domain/repositories/IAppointmentRepository';
import { IInternalNoteRepository } from '@domain/repositories/IInternalNoteRepository';
import { Appointment, InternalNote } from '@shared/api/db';

export class ManageCommunicationUseCase {
  constructor(
    private appointmentRepository: IAppointmentRepository,
    private internalNoteRepository: IInternalNoteRepository,
    private unitOfWork: IUnitOfWork
  ) {}

  async createAppointment(appointment: Appointment): Promise<void> {
    await this.unitOfWork.execute(async () => {
      await this.appointmentRepository.save(appointment);
      
      await this.unitOfWork.registerAudit(
        'CREATE_APPOINTMENT',
        appointment.user,
        `Membuat janji temu dengan ${appointment.customerName}`
      );
      
      await this.unitOfWork.registerSync('appointments', 'INSERT', appointment as unknown as Record<string, unknown>);
    }, ['notifications', 'internal_notes']);
  }

  async createInternalNote(note: InternalNote): Promise<void> {
    await this.unitOfWork.execute(async () => {
      await this.internalNoteRepository.save(note);
      
      await this.unitOfWork.registerAudit(
        'CREATE_INTERNAL_NOTE',
        note.user,
        `Membuat catatan internal kategori ${note.category}`
      );
      
      await this.unitOfWork.registerSync('internal_notes', 'INSERT', note as unknown as Record<string, unknown>);
    }, ['notifications', 'internal_notes']);
  }
}

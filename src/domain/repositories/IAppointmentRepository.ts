import { Appointment } from '../../shared/api/db';

export interface IAppointmentRepository {
  save(appointment: Appointment): Promise<void>;
}

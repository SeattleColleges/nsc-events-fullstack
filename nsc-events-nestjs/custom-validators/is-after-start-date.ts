import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
export class IsAfterStartDate implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const object = args.object as any;
    const startDate = object.startDate;

    if (!startDate || !endDate) {
      return false;
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return end > start;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'End date must be after start date';
  }
}
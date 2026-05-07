import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { validatePasswordPolicy } from '../password-policy';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return validatePasswordPolicy(value).ok;
  }

  defaultMessage(args: ValidationArguments): string {
    const result = validatePasswordPolicy(args.value);
    if (result.ok) {
      // Unreachable: class-validator only calls defaultMessage after validate returns false.
      return `${args.property} does not meet password requirements`;
    }
    return result.message.replace(/^value\b/, args.property);
  }
}

function isStrongPasswordDecorator(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// Decorator factories follow PascalCase by NestJS/class-validator convention.
export { isStrongPasswordDecorator as IsStrongPassword };

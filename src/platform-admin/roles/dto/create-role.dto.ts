export class CreateRoleDto {
  readonly name: string;
  readonly description?: string;
  readonly isPlatformRole: boolean;
}

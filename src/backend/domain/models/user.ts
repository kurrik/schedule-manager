export interface UserProps {
  id: string;
  displayName: string;
  profileImageUrl: string;
  email: string;
}

/**
 * Represents a user in the system.
 */
export class User {
  private readonly props: UserProps;

  /**
   * Creates a new User instance.
   * @param props - The properties of the user.
   */
  constructor(props: UserProps) {
    this.props = { ...props };
  }

  /**
   * Gets the user ID.
   */
  get id(): string {
    return this.props.id;
  }

  /**
   * Gets the display name of the user.
   */
  get displayName(): string {
    return this.props.displayName;
  }

  /**
   * Gets the profile image URL of the user.
   */
  get profileImageUrl(): string {
    return this.props.profileImageUrl;
  }

  /**
   * Gets the email of the user.
   */
  get email(): string {
    return this.props.email;
  }

  /**
   * Serializes the user to a plain object.
   */
  toJSON(): UserProps {
    return {
      id: this.id,
      displayName: this.displayName,
      profileImageUrl: this.profileImageUrl,
      email: this.email,
    };
  }
}

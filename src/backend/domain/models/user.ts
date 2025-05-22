export interface UserProps {
  id: string;
  displayName: string;
  profileImageUrl: string;
}

export class User {
  private readonly props: UserProps;

  constructor(props: UserProps) {
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get profileImageUrl(): string {
    return this.props.profileImageUrl;
  }

  toJSON(): UserProps {
    return {
      id: this.id,
      displayName: this.displayName,
      profileImageUrl: this.profileImageUrl,
    };
  }
}

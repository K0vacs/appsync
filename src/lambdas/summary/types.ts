export interface Event {
  arguments: Input;
}

interface Input {
  input: Ids;
}

interface Ids {
  conversationId: string;
  customerId: string;
}

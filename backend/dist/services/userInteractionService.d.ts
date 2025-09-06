export declare class UserInteractionService {
    static getMessageComments(messageId: number): Promise<any[]>;
    static addComment(messageId: number, userId: number, content: string): Promise<any>;
    static getUserMessages(groupId: number): Promise<any[]>;
    static createUserMessage(groupId: number, userId: number, title: string, content: string, messageType?: string): Promise<any>;
    static getAllGroupMessages(groupId: number): Promise<any[]>;
    static getUserOwnMessages(userId: number, groupId: number): Promise<any[]>;
    static deleteUserMessage(messageId: number, userId: number): Promise<any>;
}
//# sourceMappingURL=userInteractionService.d.ts.map
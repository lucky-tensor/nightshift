/**
 * Code Index Prototype - TypeScript Implementation
 *
 * Demonstrates semantic code indexing with embeddings and keyword extraction.
 */

interface CodeEmbedding {
    id: string;
    filePath: string;
    elementType: "function" | "class" | "interface" | "comment";
    name: string;
    content: string;
    embedding: number[];
    keywords: Set<string>;
}

interface SearchResult {
    id: string;
    filePath: string;
    name: string;
    type: string;
    relevance: number;
    highlights: string[];
}

export class CodeIndex {
    private embeddings: Map<string, CodeEmbedding> = new Map();
    private keywordIndex: Map<string, Set<string>> = new Map();
    private fileRegistry: Map<string, string> = new Map();

    index(
        filePath: string,
        elementType: "function" | "class" | "interface" | "comment",
        name: string,
        content: string
    ): void {
        const id = `${filePath}:${name}`;
        const embedding = this.generateEmbedding(content);
        const keywords = this.extractKeywords(content);

        this.embeddings.set(id, {
            id,
            filePath,
            elementType,
            name,
            content,
            embedding,
            keywords,
        });

        keywords.forEach((keyword) => {
            if (!this.keywordIndex.has(keyword)) {
                this.keywordIndex.set(keyword, new Set());
            }
            this.keywordIndex.get(keyword)!.add(id);
        });

        this.fileRegistry.set(filePath, this.hashContent(content));
    }

    searchByKeyword(query: string, limit: number = 5): SearchResult[] {
        const keyword = query.toLowerCase();
        const ids = this.keywordIndex.get(keyword);

        if (!ids || ids.size === 0) {
            return [];
        }

        return Array.from(ids)
            .map((id) => this.embeddings.get(id)!)
            .map((e) => ({
                id: e.id,
                filePath: e.filePath,
                name: e.name,
                type: e.elementType,
                relevance: e.keywords.has(keyword) ? 1.0 : 0.0,
                highlights: this.findHighlights(e.content, query),
            }))
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);
    }

    async searchByEmbedding(query: string, limit: number = 5): Promise<SearchResult[]> {
        const queryEmbedding = this.generateEmbedding(query);

        const results: (SearchResult & { similarity: number })[] = [];

        this.embeddings.forEach((embedding) => {
            const similarity = this.cosineSimilarity(queryEmbedding, embedding.embedding);
            results.push({
                id: embedding.id,
                filePath: embedding.filePath,
                name: embedding.name,
                type: embedding.elementType,
                relevance: similarity,
                similarity,
                highlights: this.findHighlights(embedding.content, query),
            });
        });

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(({ similarity, ...rest }) => rest);
    }

    async search(
        query: string,
        options: { keywordWeight?: number; semanticWeight?: number; limit?: number } = {}
    ): Promise<SearchResult[]> {
        const { keywordWeight = 0.4, semanticWeight = 0.6, limit = 5 } = options;

        const keywordResults = this.searchByKeyword(query, limit * 2);
        const semanticResults = await this.searchByEmbedding(query, limit * 2);

        const scored = new Map<string, number>();

        keywordResults.forEach((result, rank) => {
            const score = keywordWeight / (rank + 1);
            scored.set(result.id, (scored.get(result.id) || 0) + score);
        });

        semanticResults.forEach((result, rank) => {
            const score = semanticWeight / (rank + 1);
            scored.set(result.id, (scored.get(result.id) || 0) + score);
        });

        return Array.from(scored.entries())
            .map(([id, score]) => {
                const emb = this.embeddings.get(id)!;
                return {
                    id: emb.id,
                    filePath: emb.filePath,
                    name: emb.name,
                    type: emb.elementType,
                    relevance: score,
                    highlights: this.findHighlights(emb.content, query),
                };
            })
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);
    }

    getStats(): { totalEmbeddings: number; totalKeywords: number; filesIndexed: number } {
        return {
            totalEmbeddings: this.embeddings.size,
            totalKeywords: this.keywordIndex.size,
            filesIndexed: this.fileRegistry.size,
        };
    }

    private generateEmbedding(content: string): number[] {
        const words = content
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 2);
        const embedding = new Array(128).fill(0);

        words.forEach((word) => {
            const hash = this.hashWord(word) % 128;
            embedding[hash] += 1;
        });

        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? embedding.map((v) => v / magnitude) : embedding;
    }

    private extractKeywords(content: string): Set<string> {
        const keywords = new Set<string>();

        const identifierRegex = /\b[a-z][a-zA-Z0-9]*\b/g;
        let match;
        const contentLower = content.toLowerCase();

        while ((match = identifierRegex.exec(content)) !== null) {
            if (match[0].length > 2 && !this.isCommonWord(match[0])) {
                keywords.add(match[0].toLowerCase());
            }
        }

        const techTerms = [
            "async",
            "await",
            "interface",
            "class",
            "function",
            "const",
            "let",
            "export",
            "import",
            "type",
            "extends",
            "implements",
            "void",
            "return",
            "if",
            "else",
            "for",
            "while",
            "try",
            "catch",
            "throw",
            "new",
            "async",
            "await",
            "promise",
            "callback",
            "event",
            "handler",
        ];

        techTerms.forEach((term) => {
            if (contentLower.includes(term)) {
                keywords.add(term);
            }
        });

        return keywords;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        for (let i = 0; i < a.length; i++) {
            const valA = a[i];
            const valB = b[i];
            if (valA === undefined || valB === undefined) continue;

            dotProduct += valA * valB;
            magA += valA * valA;
            magB += valB * valB;
        }

        magA = Math.sqrt(magA);
        magB = Math.sqrt(magB);

        return magA > 0 && magB > 0 ? dotProduct / (magA * magB) : 0;
    }

    private findHighlights(content: string, query: string): string[] {
        const highlights: string[] = [];
        const queryWords = query.toLowerCase().split(/\s+/);

        const lines = content.split("\n");
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (queryWords.some((q) => lowerLine.includes(q))) {
                highlights.push(line.trim());
                if (highlights.length >= 3) break;
            }
        }

        return highlights;
    }

    private hashWord(word: string): number {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private hashContent(content: string): string {
        return require("crypto").createHash("md5").update(content).digest("hex");
    }

    private isCommonWord(word: string): boolean {
        const common = new Set([
            "the",
            "and",
            "for",
            "are",
            "but",
            "not",
            "you",
            "all",
            "can",
            "her",
            "was",
            "one",
            "our",
            "out",
            "get",
            "has",
            "him",
            "his",
            "how",
            "its",
            "may",
            "new",
            "now",
            "old",
            "see",
            "two",
            "way",
            "who",
            "boy",
            "did",
            "let",
            "put",
            "say",
            "she",
            "too",
            "use",
            "var",
            "const",
            "function",
        ]);
        return common.has(word.toLowerCase());
    }
}

async function main() {
    console.log("=".repeat(60));
    console.log("  Code Index Prototype: Semantic & Keyword Search");
    console.log("=".repeat(60));

    const index = new CodeIndex();

    console.log("\n📁 Indexing sample code...");

    index.index(
        "src/auth.ts",
        "class",
        "AuthService",
        `export class AuthService {
    async login(email: string, password: string): Promise<User> {
        if (!email || !password) {
            throw new Error("Credentials required");
        }
        const user = await this.findUser(email);
        if (!user) throw new Error("User not found");
        if (await this.verifyPassword(user, password)) {
            return user;
        }
        throw new Error("Invalid password");
    }
}`
    );

    index.index(
        "src/user.ts",
        "class",
        "UserService",
        `export class UserService {
    private users: Map<string, User> = new Map();
    
    async findUser(email: string): Promise<User | undefined> {
        return this.users.get(email);
    }
    
    async createUser(data: CreateUserDto): Promise<User> {
        const user = new User(data);
        this.users.set(user.email, user);
        return user;
    }
}`
    );

    const stats = index.getStats();
    console.log(`✅ Indexed: ${stats.totalEmbeddings} embeddings, ${stats.totalKeywords} keywords`);

    console.log("\n🔍 Test Searches:");

    console.log("\n  [1] Keyword search for 'password':");
    const kwResults = index.searchByKeyword("password");
    kwResults.forEach((r) => {
        console.log(`     - ${r.name} (${r.type}) in ${r.filePath}`);
    });

    console.log("\n  [2] Semantic search for 'authentication flow':");
    const semResults = await index.searchByEmbedding("authentication flow");
    semResults.forEach((r) => {
        console.log(`     - ${r.name} (${r.type}) similarity: ${(r.relevance * 100).toFixed(1)}%`);
    });

    console.log("\n  [3] Hybrid search for 'user login validation':");
    const hybridResults = await index.search("user login validation");
    hybridResults.forEach((r) => {
        console.log(`     - ${r.name} (${r.type}) relevance: ${(r.relevance * 100).toFixed(1)}%`);
        if (r.highlights.length > 0) {
            console.log(`       Highlight: "${r.highlights[0]!.slice(0, 60)}..."`);
        }
    });

    console.log("\n📊 Index Statistics:");
    console.log(`   - Total embeddings: ${stats.totalEmbeddings}`);
    console.log(`   - Total keywords: ${stats.totalKeywords}`);
    console.log(`   - Files indexed: ${stats.filesIndexed}`);

    console.log("\n" + "=".repeat(60));
    console.log("  Prototype Complete!");
    console.log("=".repeat(60));
}

main().catch(console.error);

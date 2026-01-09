/**
 * Code Indexing Manager
 *
 * Manages embeddings and keyword indices for fast agent searching throughout the codebase.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { CodeIndex, CodeEmbedding, KeywordIndex, CodeLocation } from "../types/index";

export class CodeIndexManager {
    private projectPath: string;
    private indexPath: string;
    private index: CodeIndex;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
        this.indexPath = join(projectPath, ".dark-factory", "code-index.json");
        this.index = this.loadIndex();
    }

    /**
     * Load existing code index or create new one
     */
    private loadIndex(): CodeIndex {
        if (existsSync(this.indexPath)) {
            try {
                const data = readFileSync(this.indexPath, "utf-8");
                return JSON.parse(data);
            } catch (error) {
                console.error("Failed to load code index:", error);
            }
        }

        return {
            embeddings: [],
            keywords: [],
            lastUpdated: new Date().toISOString(),
        };
    }

    /**
     * Save code index to disk
     */
    private saveIndex(): void {
        try {
            const indexDir = dirname(this.indexPath);
            if (!existsSync(indexDir)) {
                execSync(`mkdir -p "${indexDir}"`);
            }

            this.index.lastUpdated = new Date().toISOString();
            writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
        } catch (error) {
            console.error("Failed to save code index:", error);
        }
    }

    /**
     * Index all source files in the project (Incremental)
     */
    async indexProject(): Promise<void> {
        console.log("Indexing project codebase...");
        
        // Get all source files
        const sourceFiles = this.getSourceFiles();
        
        // Keep track of which files we've seen to remove deleted ones later
        const seenFiles = new Set<string>();
        
        // Process each file
        for (const filePath of sourceFiles) {
            seenFiles.add(filePath);
            const content = readFileSync(filePath, "utf-8");
            const currentHash = this.generateHash(content);
            
            // Check if file has changed
            const existingEmbeddings = this.index.embeddings.filter(e => e.filePath === filePath);
            if (existingEmbeddings.length > 0 && existingEmbeddings[0].contentHash === currentHash) {
                // Skip unchanged file
                continue;
            }
            
            // Remove old entries for this file
            this.removeFileFromIndex(filePath);
            
            // Re-index file
            await this.indexFile(filePath, content);
        }
        
        // Remove files that no longer exist
        this.index.embeddings = this.index.embeddings.filter(e => seenFiles.has(e.filePath));
        this.index.keywords.forEach(k => {
            k.locations = k.locations.filter(l => seenFiles.has(l.filePath));
        });
        this.index.keywords = this.index.keywords.filter(k => k.locations.length > 0);
        
        this.saveIndex();
        console.log(`Indexed ${sourceFiles.length} files. Current index: ${this.index.embeddings.length} embeddings`);
    }

    /**
     * Remove all entries for a specific file from the index
     */
    private removeFileFromIndex(filePath: string): void {
        this.index.embeddings = this.index.embeddings.filter(e => e.filePath !== filePath);
        this.index.keywords.forEach(k => {
            k.locations = k.locations.filter(l => l.filePath !== filePath);
        });
    }

    /**
     * Index a single file with provided content
     */
    private async indexFile(filePath: string, content: string): Promise<void> {
        try {
            const lines = content.split("\n");
            const contentHash = this.generateHash(content);
            const codeElements = this.extractCodeElements(content, lines);
            
            for (const element of codeElements) {
                const embedding: CodeEmbedding = {
                    filePath,
                    contentHash,
                    embedding: await this.generateEmbedding(element.content),
                    type: element.type
                };
                
                this.index.embeddings.push(embedding);
                
                const keywords = this.extractKeywords(element.content);
                for (const keyword of keywords) {
                    this.addKeyword(keyword, filePath, element.lineStart, element.lineEnd, element.type);
                }
            }
        } catch (error) {
            console.error(`Failed to index file ${filePath}:`, error);
        }
    }

        this.saveIndex();
        console.log(
            `Indexed ${sourceFiles.length} files with ${this.index.embeddings.length} embeddings`
        );
    }

    /**
     * Get all source files in the project
     */
    private getSourceFiles(): string[] {
        const extensions = [".ts", ".tsx", ".js", ".jsx", ".md", ".json"];

        try {
            const result = execSync(
                `find "${this.projectPath}" -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.md" -o -name "*.json" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*"`,
                { encoding: "utf-8" }
            );

            return result.trim().split("\n").filter(Boolean);
        } catch (error) {
            console.error("Failed to find source files:", error);
            return [];
        }
    }

    /**
     * Index a single file
     */
    private async indexFile(filePath: string): Promise<void> {
        try {
            const content = readFileSync(filePath, "utf-8");
            const lines = content.split("\n");

            // Generate content hash
            const contentHash = this.generateHash(content);

            // Extract functions, classes, and interfaces
            const codeElements = this.extractCodeElements(content, lines);

            // Create embeddings for each element
            for (const element of codeElements) {
                const embedding: CodeEmbedding = {
                    filePath,
                    contentHash,
                    embedding: await this.generateEmbedding(element.content),
                    type: element.type,
                };

                this.index.embeddings.push(embedding);

                // Extract keywords
                const keywords = this.extractKeywords(element.content);
                for (const keyword of keywords) {
                    this.addKeyword(
                        keyword,
                        filePath,
                        element.lineStart,
                        element.lineEnd,
                        element.type
                    );
                }
            }
        } catch (error) {
            console.error(`Failed to index file ${filePath}:`, error);
        }
    }

    /**
     * Extract code elements (functions, classes, etc.) from content
     */
    private extractCodeElements(
        content: string,
        lines: string[]
    ): Array<{
        content: string;
        type: "function" | "class" | "interface" | "comment" | "documentation";
        lineStart: number;
        lineEnd: number;
    }> {
        const elements: Array<{
            content: string;
            type: "function" | "class" | "interface" | "comment" | "documentation";
            lineStart: number;
            lineEnd: number;
        }> = [];

        // Function detection
        const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const lineStart = content.substring(0, match.index).split("\n").length - 1;
            const functionContent = this.extractFunctionContent(content, match.index);
            const lineEnd = lineStart + functionContent.split("\n").length;

            elements.push({
                content: functionContent,
                type: "function",
                lineStart,
                lineEnd,
            });
        }

        // Class detection
        const classRegex = /^(?:export\s+)?class\s+(\w+)/gm;
        while ((match = classRegex.exec(content)) !== null) {
            const lineStart = content.substring(0, match.index).split("\n").length - 1;
            const classContent = this.extractClassContent(content, match.index);
            const lineEnd = lineStart + classContent.split("\n").length;

            elements.push({
                content: classContent,
                type: "class",
                lineStart,
                lineEnd,
            });
        }

        // Interface detection
        const interfaceRegex = /^(?:export\s+)?interface\s+(\w+)/gm;
        while ((match = interfaceRegex.exec(content)) !== null) {
            const lineStart = content.substring(0, match.index).split("\n").length - 1;
            const interfaceContent = this.extractInterfaceContent(content, match.index);
            const lineEnd = lineStart + interfaceContent.split("\n").length;

            elements.push({
                content: interfaceContent,
                type: "interface",
                lineStart,
                lineEnd,
            });
        }

        // Documentation comments
        const docCommentRegex = /\/\*\*[\s\S]*?\*\//gm;
        while ((match = docCommentRegex.exec(content)) !== null) {
            const lineStart = content.substring(0, match.index).split("\n").length - 1;
            const lineEnd = lineStart + match[0].split("\n").length;

            elements.push({
                content: match[0],
                type: "documentation",
                lineStart,
                lineEnd,
            });
        }

        return elements;
    }

    /**
     * Extract function content including body
     */
    private extractFunctionContent(content: string, startIndex: number): string {
        const functionStart = content.indexOf("{", startIndex);
        if (functionStart === -1) return content.substring(startIndex);

        let braceCount = 0;
        let endIndex = functionStart;

        for (let i = functionStart; i < content.length; i++) {
            if (content[i] === "{") braceCount++;
            if (content[i] === "}") braceCount--;

            if (braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }

        return content.substring(startIndex, endIndex);
    }

    /**
     * Extract class content including body
     */
    private extractClassContent(content: string, startIndex: number): string {
        return this.extractFunctionContent(content, startIndex);
    }

    /**
     * Extract interface content
     */
    private extractInterfaceContent(content: string, startIndex: number): string {
        const interfaceStart = content.indexOf("{", startIndex);
        if (interfaceStart === -1) return content.substring(startIndex);

        let braceCount = 0;
        let endIndex = interfaceStart;

        for (let i = interfaceStart; i < content.length; i++) {
            if (content[i] === "{") braceCount++;
            if (content[i] === "}") braceCount--;

            if (braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }

        return content.substring(startIndex, endIndex);
    }

    /**
     * Generate embedding for content (simplified version)
     */
    private async generateEmbedding(content: string): Promise<number[]> {
        // This is a placeholder for actual embedding generation
        // In production, you'd use a service like OpenAI embeddings or a local model
        const words = content.toLowerCase().split(/\s+/);
        const embedding = new Array(128).fill(0);

        // Simple word-based embedding (placeholder)
        words.forEach((word, index) => {
            const hash = this.simpleHash(word);
            embedding[hash % embedding.length] += 1;
        });

        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
    }

    /**
     * Extract keywords from content
     */
    private extractKeywords(content: string): string[] {
        // Extract identifiers, function names, class names, etc.
        const keywords = new Set<string>();

        // CamelCase and snake_case identifiers
        const identifierRegex = /\b[a-z][a-zA-Z0-9]*\b/g;
        let match;
        while ((match = identifierRegex.exec(content)) !== null) {
            if (match[0].length > 2) {
                // Filter out short words
                keywords.add(match[0].toLowerCase());
            }
        }

        // TypeScript keywords
        const tsKeywords = [
            "interface",
            "class",
            "function",
            "const",
            "let",
            "var",
            "type",
            "enum",
            "import",
            "export",
        ];
        tsKeywords.forEach((keyword) => {
            if (content.includes(keyword)) {
                keywords.add(keyword);
            }
        });

        return Array.from(keywords);
    }

    /**
     * Add keyword to index
     */
    private addKeyword(
        keyword: string,
        filePath: string,
        lineStart: number,
        lineEnd: number,
        type: "definition" | "usage" | "documentation"
    ): void {
        let keywordIndex = this.index.keywords.find((k) => k.keyword === keyword);

        if (!keywordIndex) {
            keywordIndex = {
                keyword,
                locations: [],
                frequency: 0,
            };
            this.index.keywords.push(keywordIndex);
        }

        keywordIndex.locations.push({
            filePath,
            lineStart,
            lineEnd,
            type,
        });

        keywordIndex.frequency++;
    }

    /**
     * Search code by keyword
     */
    searchByKeyword(keyword: string): CodeLocation[] {
        const keywordIndex = this.index.keywords.find((k) => k.keyword === keyword.toLowerCase());
        return keywordIndex ? keywordIndex.locations : [];
    }

    /**
     * Search code by semantic similarity (placeholder)
     */
    async searchByEmbedding(
        query: string,
        limit: number = 5
    ): Promise<Array<CodeEmbedding & { similarity: number }>> {
        const queryEmbedding = await this.generateEmbedding(query);

        const similarities = this.index.embeddings.map((embedding) => ({
            ...embedding,
            similarity: this.cosineSimilarity(queryEmbedding, embedding.embedding),
        }));

        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            magnitudeA += a[i] * a[i];
            magnitudeB += b[i] * b[i];
        }

        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);

        return magnitudeA > 0 && magnitudeB > 0 ? dotProduct / (magnitudeA * magnitudeB) : 0;
    }

    /**
     * Simple hash function for embedding generation
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Generate content hash
     */
    private generateHash(content: string): string {
        // Simple hash for now - in production use crypto
        return this.simpleHash(content).toString();
    }

    /**
     * Get index statistics
     */
    getIndexStats(): { totalEmbeddings: number; totalKeywords: number; lastUpdated: string } {
        return {
            totalEmbeddings: this.index.embeddings.length,
            totalKeywords: this.index.keywords.length,
            lastUpdated: this.index.lastUpdated,
        };
    }
}

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../public/test-files/linear-algebra.docx');

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "The Power of Linear Algebra: The Mathematics of Data and Dimensions",
                heading: HeadingLevel.TITLE,
                alignment: "center"
            }),
            new Paragraph({ text: "" }), // Spacing
            
            new Paragraph({
                text: "Introduction",
                heading: HeadingLevel.HEADING_1
            }),
            new Paragraph({
                children: [
                    new TextRun("Linear Algebra is arguably the most important branch of mathematics for the modern world. While Calculus gives us the language to describe change in continuous systems, Linear Algebra provides the framework for handling data, multiple dimensions, and complex relationships in a structured way. From the compression of images on your phone to the search algorithms of Google, and the deep neural networks driving Artificial Intelligence, Linear Algebra is the engine under the hood.")
                ]
            }),
            new Paragraph({
                text: "At its core, Linear Algebra is the study of vectors, vector spaces, and linear transformations between these spaces. It allows us to manipulate and solve systems of linear equations simultaneously, which turns out to be a universal need in science and engineering."
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
                text: "1. The Building Blocks: Vectors and Matrices",
                heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
                text: "Vectors",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "A vector is an object that has both a magnitude and a direction. Geometrically, we can picture a vector as an arrow in space. In computer science and data analysis, a vector is simply an ordered list of numbers. For example, the state of a house in a real estate dataset might be represented as a vector: [2500, 3, 2], representing 2500 square feet, 3 bedrooms, and 2 bathrooms."
            }),
            new Paragraph({
                text: "Matrices",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "A matrix is a rectangular array of numbers arranged in rows and columns. It effectively represents a collection of vectors or a transformation that moves vectors from one place to another. A spreadsheet is essentially a matrix. An image is a matrix of pixel values. If you have a 2D image that is 1080x1920 pixels, it is a matrix with 1080 rows and 1920 columns, where each entry represents the brightness or color of a pixel."
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
                text: "2. Fundamental Operations",
                heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
                text: "Linear Transformations",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "One of the most profound ideas in Linear Algebra is that matrices are not just static tables of data; they are active operators. Multiplying a vector by a matrix transforms that vector. It can rotate, scale, shear, or project the vector into a new space. For example, in video game graphics, every time you move your character or change the camera angle, the computer is performing millions of matrix multiplications to calculate where every point on the 3D model should land on your 2D screen."
            }),
            new Paragraph({
                text: "Determinants and Eigenvalues",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "• The Determinant of a square matrix is a single number that tells us how the matrix scales volume. If the determinant is 2, the transformation doubles the area (in 2D) or volume (in 3D). If it is 0, the transformation squashes the space into a lower dimension, destroying information."
            }),
            new Paragraph({
                text: "• Eigenvalues and Eigenvectors are the \"characteristic\" directions of a matrix. An eigenvector is a vector that doesn't change direction during a transformation; it only stretches or shrinks. The amount it stretches is the eigenvalue. These are crucial for understanding the long-term behavior of systems, such as solving differential equations or analyzing stability in bridges."
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
                text: "3. Real-World Applications",
                heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
                text: "Computer Graphics and Vision",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "Every frame of a 3D video game involves 4x4 matrix multiplications to handle translation, rotation, and scaling of objects. \"Homogeneous coordinates\" allow all these operations to be combined into single matrix operations, optimized by GPUs which are essential \"Linear Algebra calculators\"."
            }),
            new Paragraph({
                text: "Machine Learning and AI",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "Deep Learning is essentially Linear Algebra at massive scale. A neural network is a series of matrix multiplications (followed by non-linear activations). When ChatGPT processes text, it first converts words into high-dimensional vectors (embeddings)—lists of thousands of numbers. The concepts of vector similarity (dot product) allow the model to understand that \"King\" and \"Queen\" are related in the same way as \"Man\" and \"Woman\"."
            }),
            new Paragraph({
                text: "Search Engines (PageRank)",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "Google's original PageRank algorithm modeled the entire web as a gigantic matrix (the transition matrix). The importance of a webpage was found by calculating the principal eigenvector of this matrix. In simple terms, Linear Algebra allowed Google to solve the equation \"A page is important if important pages link to it\" for billions of pages simultaneously."
            }),
            new Paragraph({
                text: "Signal Processing and compression",
                heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
                text: "Your JPEG images and MP3 audio files use transformations (like the Discrete Cosine Transform) which are linear operations. They take data from the \"spatial domain\" (pixels) to the \"frequency domain\", allowing us to discard high-frequency data that humans can't perceive, thus compressing the file size significantly."
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
                text: "Conclusion",
                heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
                text: "Linear Algebra is more than just solving for x and y. It is the language of high-dimensional space. In an age where data is the new oil, Linear Algebra is the refinery. Whether you are building bridges, designing video games, analyzing financial markets, or creating Artificial General Intelligence, understanding the elegant structures of vectors and matrices is indispensable. It converts complex, multi-dimensional chaos into solvable, orderly equations."
            })
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log('DOCX generated at ' + outputPath);
});

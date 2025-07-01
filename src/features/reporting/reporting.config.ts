/**
 * Reporting configuration
 */
export const reportingConfig = {
  OUTPUT_SUMMARY_HTML_FILE: "codebase-report.html",
  APP_DESCRIPTION_KEY: "appDescription",
  HTML_PREFIX: `
  <html>
    <head>
      <title>Codebase Analysis Report</title>
      <style>  
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #f5f5f5;
          line-height: 1.5;
          padding: 20px;
        }

        h1 {
          font-size: 2.05em;
          color: #333;
          margin-bottom: 20px;
        }

        h2 {
          font-size: 1.6em;
          color: #333;
          margin-bottom: 15px;
        }

        h3 {
          font-size: 1.4em;
          color: #333;
          margin-bottom: 10px;
        }

        p {
          font-size: 1em;
          margin-bottom: 20px;
        }

        .note-paragraph {
          font-size: 0.9em;
          font-style: italic;
          margin-bottom: 20px;
        }

        ul {
          list-style-type: disc;
          padding-left: 40px;
        }

        ul li {
          margin-bottom: 10px;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 20px;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 15px;
          text-align: left;
        }

        th {
          background-color: #4CAF50;
          color: white;
        }

        tr:nth-child(even) {
          background-color: #f2f2f2;
        }

        tr:hover {
          background-color: #ddd;
        }
      </style>
    </head>
    <body>
  `,
  HTML_SUFFIX: `
    </body>
  </html>
  `,
} as const;

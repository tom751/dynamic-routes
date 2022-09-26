import fs from 'fs/promises'
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import path from 'path'
import matter from 'gray-matter'
import ReactMarkdown from 'react-markdown'
import { ParsedUrlQuery } from 'querystring'

export default function LegalPageVersion({ content }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <ReactMarkdown>{content}</ReactMarkdown>
}

interface LegalPagePathParam {
  type: string
  version: string
}

interface ParsedMarkdownFile {
  parsedFile: matter.GrayMatterFile<string>
  fileName: string
}

const folderPath = 'content/legal'

export const getStaticPaths: GetStaticPaths = async () => {
  const folderDir = path.join(folderPath)
  const dirs = await fs.readdir(folderDir)

  const result: LegalPagePathParam[] = []

  for (const dirName of dirs) {
    const legalFolderDir = path.join(folderPath, dirName)
    const legalDocs = await fs.readdir(legalFolderDir)
    if (legalDocs.length === 0) {
      continue
    }

    const files: ParsedMarkdownFile[] = []
    // get the old versions of the docs
    for (const docVersion of legalDocs) {
      const docPath = path.join(legalFolderDir, docVersion)
      // read and parse
      const file = matter.read(docPath)
      files.push({
        parsedFile: file,
        fileName: docVersion,
      })
    }

    // order by creation date
    files.sort((a, b) => a.parsedFile.data.creationDate - b.parsedFile.data.creationDate)

    // remove the last (most recent) version
    files.pop()

    result.push(
      ...files.map((f) => {
        const version = f.fileName.split('.').shift()
        if (!version) {
          throw new Error('no version in filename')
        }

        return { type: dirName, version }
      })
    )
  }

  return {
    paths: result.map(({ type, version }) => ({
      params: { type, version },
    })),
    fallback: false,
  }
}

interface Params extends ParsedUrlQuery, LegalPagePathParam {}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }

  const { type, version } = params as Params

  const filePath = path.join(folderPath, type, `${version}.md`)
  const file = matter.read(filePath)

  return {
    props: {
      content: file.content,
    },
  }
}

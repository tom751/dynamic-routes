import fs from 'fs/promises'
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import path from 'path'
import matter from 'gray-matter'
import ReactMarkdown from 'react-markdown'
import { ParsedUrlQuery } from 'querystring'

export default function LegalPage({ content }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <ReactMarkdown>{content}</ReactMarkdown>
}

interface LegalPagePathParam {
  type: string
}

const folderPath = 'content/legal'

export const getStaticPaths: GetStaticPaths = async () => {
  const folderDir = path.join(folderPath)
  const dirs = await fs.readdir(folderDir)

  return {
    paths: dirs.map((dir) => ({
      params: { type: dir },
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

  const { type } = params as Params
  const legalFolderDir = path.join(folderPath, type)
  const legalDocs = await fs.readdir(legalFolderDir)
  if (legalDocs.length === 0) {
    throw new Error('no docs in this folder')
  }

  const files: matter.GrayMatterFile<string>[] = []
  // get all the versions of the docs
  for (const docVersion of legalDocs) {
    const docPath = path.join(legalFolderDir, docVersion)
    // read and parse
    const file = matter.read(docPath)
    files.push(file)
  }

  // order by creation date
  files.sort((a, b) => a.data.creationDate - b.data.creationDate)

  // remove the last (most recent) version
  const mostRecent = files.pop()
  if (!mostRecent) {
    throw new Error('there is no most recent doc version')
  }

  return {
    props: {
      content: mostRecent.content,
    },
  }
}

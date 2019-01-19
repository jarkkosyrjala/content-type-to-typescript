import { ContentType, createClient } from 'contentful';
import fs from 'fs';
import { compileFromContentTypes } from './content-type-to-typescript';
import { logError, logSuccess } from './log';

async function fetchContentTypes({
  accessToken,
  space,
}: {
  accessToken: string;
  space: string;
}): Promise<ContentType[]> {
  try {
    const client = createClient({
      accessToken,
      space,
    });

    let skip = 0;
    let contentTypes: any[] = []
    while (true) {
      const { items, total } = await client.getContentTypes({skip});
      contentTypes = contentTypes.concat(items)
      skip += items.length;

      if (skip >= total) {
        break;
      }
    }

    return contentTypes;
  } catch (err) {
    logError(err.response.data.message);

    throw err;
  }
}

async function compile(contentTypes: ContentType[], prefix?: string): Promise<string> {
  try {
    const ts = await compileFromContentTypes(contentTypes, undefined, prefix);
    return ts;
  } catch (err) {
    logError(err.message);
    throw err;
  }
}

function writeFile(output: string, ts: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(output, ts, (err) => {
      if (err) {
        logError(err.message);
        reject(err);
      } else {
        logSuccess('TypeScript Definitions were successfully created!');
        resolve();
      }
    });
  });
}

export default async function({
  accessToken,
  space,
  output,
  prefix,
}: {
  accessToken: string;
  space: string;
  output: string;
  prefix?: string
}) {
  const contentTypes = await fetchContentTypes({ accessToken, space });

  const ts = await compile(contentTypes, prefix);

  await writeFile(output, ts);
}

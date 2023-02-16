'use strict';

import { createParser } from 'eventsource-parser';
import './styles.css';

const spinner = `
        <svg aria-hidden="true" class="w-4 h-4 text-gray-200 animate-spin dark:text-slate-200 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
`;
const checkmark = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-green-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`;
const xcircle = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-red-600">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
`;

// PAT token settings
document.getElementById('patToken').value = localStorage.getItem('patToken');
document.getElementById('savePAT').addEventListener('click', function () {
  localStorage.setItem('patToken', document.getElementById('patToken').value);
});

// postComments settings
let postComments = document.getElementById('postComments')
postComments.checked = (localStorage.getItem('postComments') === 'true');
postComments.addEventListener('change', function () {
  console.log('changed comment preference: ' + postComments.checked);
  localStorage.setItem('postComments', postComments.checked);
});


if (localStorage.getItem('activeButton')) {
  activateButton(localStorage.getItem('activeButton'))
} else {
  activateButton('azure')
}


function activateButton(buttonActivated) {
  let contentList = ["azureContent", "githubContent", "codeSnippetContent"]
  let buttonList = ["azure", "github", "codeSnippet"]

  for (let i = 0; i < contentList.length; i++) {

    if (!(document.getElementById(buttonList[i]))) {
      continue;
    }
    if (buttonActivated === buttonList[i]) {
      document.getElementById(contentList[i]).style.display = "block";
      document.getElementById(buttonList[i]).classList.add("activeButton");
    }
    else {
      document.getElementById(contentList[i]).style.display = "none";
      document.getElementById(buttonList[i]).classList.remove("activeButton");
    }
  }
  localStorage.setItem('activeButton', buttonActivated)
}

function parseJsonOrReturnAsIs(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

function inProgress(ongoing, failed = false, rerun = true, isCodeSnippet = false) {
  let statusIcon = 'status-icon'
  let rerunButton = 'rerun-btn'
  if (isCodeSnippet) {
    rerunButton += '-cs'
    statusIcon += '-cs'
  }

  if (ongoing) {
    document.getElementById(statusIcon).innerHTML = spinner;
    document.getElementById(rerunButton).classList.add('invisible');
  } else {
    if (failed) {
      document.getElementById(statusIcon).innerHTML = xcircle;
    } else {
      document.getElementById(statusIcon).innerHTML = checkmark;
    }
    if (rerun) {
      document.getElementById(rerunButton).classList.remove('invisible');
    }
  }
}

function inProgressCodeSnippet(ongoing, failed = false, rerun = true) {
  inProgress(ongoing,failed, rerun, true)
}

async function getPRDetails() {
  let tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  console.log(tab.url);
  let prDetail = { isRightUrl: true, url: tab.url };

  let vsPattern =
    /https:\/\/([^.]+).visualstudio.com\/([^\/]+)\/_git\/([^\/]+)\/pullrequest\/(\d+)/;
  let devAzurepattern =
    /https:\/\/dev.azure.com\/([^\/]+)\/([^\/]+)\/_git\/([^\/]+)\/pullrequest\/(\d+)/;
  let vsMatch = vsPattern.exec(tab.url);
  let devMatch = devAzurepattern.exec(tab.url);

  if (vsMatch) {
    prDetail.organisation = vsMatch[1];
    prDetail.project = vsMatch[2];
    prDetail.repoName = vsMatch[3];
    prDetail.pullRequestId = vsMatch[4];
    prDetail.prSessionKey =
      prDetail.organisation + prDetail.repoName + prDetail.pullRequestId;
  } else if (devMatch) {
    prDetail.organisation = devMatch[1];
    prDetail.project = devMatch[2];
    prDetail.repoName = devMatch[3];
    prDetail.pullRequestId = devMatch[4];
    prDetail.prSessionKey =
      prDetail.organisation + prDetail.repoName + prDetail.pullRequestId;
  } else {
    prDetail.isRightUrl = false;
  }

  console.log(JSON.stringify(prDetail));
  return prDetail;
}

async function getAccessToken() {
  const resp = await fetch('https://chat.openai.com/api/auth/session')
    .then((r) => r.json())
    .catch(() => ({}));
  if (!resp.accessToken) {
    throw new Error('UNAUTHORIZED');
  }
  return resp.accessToken;
}

async function* streamAsyncIterable(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function fetchSSE(resource, options) {
  const { onMessage, ...fetchOptions } = options;
  const resp = await fetch(resource, fetchOptions);
  if (resp.status > 399) {
    resp.json().then((r) => {
      inProgress(false, true);
      onMessage(
        JSON.stringify({ message: { content: { parts: [r.detail] } } })
      );
    });
    return;
  }
  const parser = createParser((event) => {
    if (event.type === 'event') {
      onMessage(event.data);
    }
  });
  for await (const chunk of streamAsyncIterable(resp.body)) {
    const str = new TextDecoder().decode(chunk);
    parser.feed(str);
  }
}

async function callChatGPT(question, callback, onDone) {
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    callback(
      'Please login at <a href="https://chat.openai.com" target="_blank" class="hover:text-slate-800" style="color: #0086ff;">chat.openai.com</a> first.'
    );
  }

  await fetchSSE('https://chat.openai.com/backend-api/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'next',
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: {
            content_type: 'text',
            parts: [question],
          },
        },
      ],
      model: 'text-davinci-002-render',
      parent_message_id: crypto.randomUUID(),
    }),
    onMessage(message) {
      console.debug('sse message', message);
      if (message === '[DONE]') {
        onDone();
        return;
      }
      const data = parseJsonOrReturnAsIs(message);
      const text = data.message?.content?.parts?.[0];
      if (text) {
        callback(text);
      }
    },
  });
}
const showdown = require('showdown');
const converter = new showdown.Converter();

async function reviewPR(prDetail) {
  console.log('Reviewing PR');
  inProgress(true);
  console.log('inProgress completed');
  document.getElementById('result').innerHTML = '';
  console.log('set innerHRML completed');
  chrome.storage.session.remove([prDetail.prSessionKey]);
  console.log('remove sessionkey');
  console.log('Reviewing PR');
  const personalAccessToken = localStorage.getItem('patToken');
  console.log(`PAT PR ${personalAccessToken} `);
  const pullRequestDetailUrl = `https://dev.azure.com/${prDetail.organisation}/${prDetail.project}/_apis/git/pullrequests/${prDetail.pullRequestId}?api-version=7.0`;
  console.log(`Making azure calls to fetch pull request details ${pullRequestDetailUrl}`);
  let headers = {
    Authorization: `Basic ${personalAccessToken}`,
    'Content-Type': 'application/json',
    Accept: '*/*'
  };
  //  str.replace("data-", "")
  console.log('Headers for AZ calls =======> ' + JSON.stringify(headers));
  const prDetailResponse = await (
    await fetch(pullRequestDetailUrl, {
      headers,
    })
  ).json();

  console.log(' PR Detail response from AZ : ' + JSON.stringify(prDetailResponse));
  prDetail.sourceBranch = prDetailResponse.sourceRefName.replace('refs/heads/', ''); // your branch
  prDetail.targetBranch = prDetailResponse.targetRefName.replace('refs/heads/', ''); // master

  prDetail.sourceCommitId = prDetailResponse.lastMergeSourceCommit.commitId;
  prDetail.targetCommitId = prDetailResponse.lastMergeTargetCommit.commitId;
  console.log(' PR Detail : ' + JSON.stringify(prDetail));

  const compareUrl = `https://dev.azure.com/${prDetail.organisation}/${prDetail.project}/_apis/git/repositories/${prDetail.repoName}/diffs/commits?$top=100&$skip=0&baseVersion=${prDetail.targetBranch}&targetVersion=${prDetail.sourceBranch}&api-version=7.0`;
  var filePathToContentObjects = [];
  const getContentsOfChangedFiles = async () => {
    const compareResponse = await (
      await fetch(compareUrl, {
        headers,
      })
    ).json();
    // console.log(JSON.stringify(compareResponse))
    console.log('compareUrl ' + compareUrl);
    const changes = compareResponse.changes;
    console.log('changes' + JSON.stringify(changes));
    for (const change of changes) {
      console.log(change.item.gitObjectType);
      if (change.item.gitObjectType === 'blob') {
        const itemUrl = `${change.item.url}`;
        console.log('found a match' + itemUrl);
        const itemResponse = await (
          await fetch(itemUrl, {
            headers,
          })
        ).text();
        console.log(`item path : ${change.item.path} response size : ${itemResponse.length}`);

        // TODO ; Add source and commit API calls
        const sourceURL = `https://dev.azure.com/${prDetail.organisation}/${prDetail.project}/_apis/git/repositories/${prDetail.repoName}/items/${change.item.path}?versionType=Commit&version=${prDetail.sourceCommitId}`;
        const targetURL = `https://dev.azure.com/${prDetail.organisation}/${prDetail.project}/_apis/git/repositories/${prDetail.repoName}/items/${change.item.path}?versionType=Commit&version=${prDetail.targetCommitId}`;

        console.log(`sourceURL of the file : ${sourceURL} \n targetURL : ${targetURL}`);

        let sourceCode = await (
          await fetch(sourceURL, {
            headers,
          })
        ).text();

        if (sourceCode.includes('could not be found')) {
          console.log('Deleted file, no review required : ' + change.item.path);
          sourceCode = '';
          continue;
        }

        let sourceFilePath = change.item.path;
        let targetFilePath = change.item.path;
        let targetCode = await (
          await fetch(targetURL, {
            headers,
          })
        ).text();

        if (targetCode.includes('could not be found')) {
          console.log("Couldn't find in target branch(master)");
          targetFilePath = '';
          targetCode = '';
        }

        const jsdiff = require('diff');
        const diff = jsdiff.createTwoFilesPatch(
          `Source ${sourceFilePath}`,
          `target ${targetFilePath}`,
          targetCode,
          sourceCode,
          '',
          '',
          { context: 0 }
        );
        // console.log(diff);
        const structuredDiff = jsdiff.structuredPatch(
          `Source ${change.item.path}`,
          `target ${change.item.path}`,
          targetCode,
          sourceCode,
          '',
          '',
          { context: 0 }
        );
        // console.log(JSON.stringify(structuredDiff));

        filePathToContentObjects.push({
          path: change.item.path,
          diff: diff,
          structuredDiff: structuredDiff,
          firstChangeLocation: structuredDiff.hunks[0].newStart
        });
      }
    }
  };

  await getContentsOfChangedFiles();

  let len = filePathToContentObjects.length;
  let responseFinal = '';
  for (let i = 0; i < len; i++) {
    // let hunks = filePathToContentObjects[i].structuredDiff; // diff
    let commentsResponseGPT = {};

    // let codeToReview = [];
    // let hunksLen = hunks.length;
    // for (let i = 0; i < hunksLen; i++) {
    //   codeToReview.push({
    //     lineNumber: hunks[i].newStart,
    //     lines: hunks[i].lines.join('\n'),
    //   });
    //   console.log('i :::::: ' + JSON.stringify(codeToReview));
    // }

    console.log("filePathToContentObjects[i].firstChangeLocation: " + filePathToContentObjects[i].firstChangeLocation)
    let prompt = `
    Act as a code reviewer of a file patch, providing precise feedback on the code changes below.
    You are provided with the diff for a file changed in a pull request in a patch format.
    Patch entry has the file name in Subject line followed by the code changes (diffs) in a unidiff format.
    \n\n
    Patch of the file to review:
    \n
    ${filePathToContentObjects[i].diff}
    \n\n

    As a code reviewer, your task is:
    - Identify potential bugs and optimization in the patch
    - Do not highlight minor issues , nitpicks and test cases.
    - Keep your comment very precise and less than 200 words.
    - Use bullet points if you have multiple comments. Order comments based on the impact.`

    console.log("prompt " + prompt)
    await callChatGPT(
      prompt,
      (answer) => {
        commentsResponseGPT = answer;
        document.getElementById('result').innerHTML =
          converter.makeHtml(answer);
      },
      () => {
        chrome.storage.session.set({
          [prDetail.prSessionKey]: document.getElementById('result').innerHTML,
        });
        inProgress(false);
      }
    );

    console.log(
      `finished reviewing the code ${filePathToContentObjects[i].path}`
    );

    var isPostCommentEnabled = (localStorage.getItem('postComments') === 'true');
    let skipConditionComment =
      commentsResponseGPT.includes('Please login at') ||
      responseFinal.includes('Too many requests');



    if (!skipConditionComment && isPostCommentEnabled) {
      // add a comment
      let addCommentURL = `https://dev.azure.com/${prDetail.organisation}/${prDetail.project}/_apis/git/repositories/${prDetail.repoName}/pullRequests/${prDetail.pullRequestId}/threads?api-version=7.0`;
      console.log(`Comment URL : ${addCommentURL}`);
      console.log(`innerHTML URL : ${commentsResponseGPT}`);
      // var commentsList = JSON.parse(commentsResponseGPT);
      // let len = commentsList.length;
      // console.log(JSON.stringify(commentsList));
      // for (let i = 0; i < len; i++) {
      //   var comment = commentsList[i];
      //   console.log(JSON.stringify(comment));
      var requestJson = {
        comments: [
          {
            content: commentsResponseGPT,
          },
        ],
        status: 1,
        threadContext: {
          filePath: filePathToContentObjects[i].path,
          rightFileEnd: {
            line: filePathToContentObjects[i].firstChangeLocation,
            offset: 4,
          },
          rightFileStart: {
            line: filePathToContentObjects[i].firstChangeLocation,
            offset: 4,
          },
        },
      };

      console.log(JSON.stringify(requestJson));
      await await fetch(addCommentURL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestJson),
      });
      // }

    }
    inProgress(true);

    let skipCondition =
      commentsResponseGPT.includes('Please login at') || responseFinal.includes('Too many requests');
    if (skipCondition) {
      responseFinal = document.getElementById('result').innerHTML;
    } else {
      responseFinal +=
        `<hr/><b> Review of ${filePathToContentObjects[i].path} </b>` +
        document.getElementById('result').innerHTML;
    }
  }

  inProgress(false);
  document.getElementById('result').innerHTML = responseFinal;
  chrome.storage.session.set({
    [prDetail.prSessionKey]: responseFinal,
  });

}

async function reviewAzurePR() {
  let prDetail = await getPRDetails();
  console.log(JSON.stringify(prDetail));
  let prUrl = document.getElementById('pr-url');
  prUrl.textContent = prDetail.url;
  console.log(prDetail.url);

  if (!prDetail.isRightUrl) {
    console.log('failed check');
    document.getElementById('result').innerHTML =
      'Please open a specific PR on *.azure.com or *.visualstudio.com';
    inProgress(false, true, false);
    await new Promise((r) => setTimeout(r, 100000));
    // window.close();
    return; // not a pr
  }

  console.log('passed check');
  document.getElementById('rerun-btn').onclick = () => {
    reviewPR(prDetail);
  };

  chrome.storage.session.get([prDetail.prSessionKey]).then((result) => {
    if (result[prDetail.prSessionKey]) {
      document.getElementById('result').innerHTML =
        result[prDetail.prSessionKey];
      inProgress(false);
    } else {
      reviewPR(prDetail);
    }
  });
}

// document.getElementById('reviewSelectedCode').addEventListener("click", async function reivewCodeSelection() {
async function reviewCodeSelection() {
  inProgressCodeSnippet(true)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => getSelection().toString(),
    });
  } catch (e) {
    inProgressCodeSnippet(false, true, true);
    return; // ignoring an unsupported page like chrome://extensions
  }
  
  console.log('Selection: ' + result);
  if(!result){
    inProgress(false, true, false);
  }

  let prompt = `
    Act as a code reviewer, providing precise feedback on the code changes below only if the provided text is code.
    \n
    ${result}
    \n
    As a code reviewer, your task is:
    - Identify potential bugs and optimization in the patch
    - Do not highlight minor issues and nitpicks.
    - Use bullet points if you have multiple comments.`

  console.log("prompt " + result)
  await callChatGPT(
    prompt,
    (answer) => {
      document.getElementById('result').innerHTML =
        converter.makeHtml(answer);
        inProgressCodeSnippet(false, false, true)
    },
    () => {
      // chrome.storage.session.set({
      //   [prDetail.prSessionKey]: document.getElementById('result').innerHTML,
      // });
      inProgressCodeSnippet(false, true, true);
    }
  );

};

if (localStorage.getItem('activeButton') === 'azure') {
  reviewAzurePR();
}

if (localStorage.getItem('activeButton') === 'codeSnippet') {
  reviewCodeSelection();
}

document.getElementById('rerun-btn-cs').onclick = () => {
  reviewCodeSelection();
};

document.getElementById('azure').addEventListener('click', function () {
  activateButton('azure');
  reviewAzurePR();
});

document.getElementById('github').addEventListener('click', function () {
  activateButton('github')
});

document.getElementById('codeSnippet').addEventListener('click', function () {
  activateButton('codeSnippet')
  reviewCodeSelection();
});
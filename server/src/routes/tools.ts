import { Router } from 'express';
import { Tool, User, Response as ApiResponse } from '../data';
import * as data from '../data';
import { requireAuth, audit } from '../middleware/auth';
import { watchdog } from '../appState';
import { validateBody, HelloSchema, ToolTopUsersSchema, DeleteSchema, SetLockoutSchema, EditToolSchema, SetCheckoutUsersSchema } from '../schemas';

function getTime() { return Math.floor(Date.now() / 1000); }

export function createToolsRouter(sendUpdate: () => void): Router {
  const router = Router();

  // Called by firmware devices — no session auth
  router.post('/hello', validateBody(HelloSchema), (req, res) => {
    const { mac, version, logs } = req.body;
    console.log('Hello from tool ' + mac);

    const users: User[] = data.getUsers();
    const tools: Tool[] = data.getTools();

    const response: { userCards: string[]; time: number } = {
      userCards: [],
      time: getTime()
    };

    const lastSeen = watchdog.find(x => x.toolMac === mac);
    if (lastSeen) {
      lastSeen.timestamp = getTime();
      if (version) {
        lastSeen.version = version;
      }
    } else {
      watchdog.push({ toolMac: mac, timestamp: getTime(), updated: false, offline: false, version });
    }

    const existingTool = tools.find(x => x.mac === mac);
    if (existingTool) {
      response.userCards = [];
      if (!existingTool.isLocked) {
        existingTool.users.forEach(x => {
          const user = users.find(u => u.id == x);
          if (user) {
            if (user.group) {
              for (const member of user.members) {
                const memberUser = users.find(u => u.id == member);
                if (memberUser && memberUser.card != "") {
                  response.userCards.push(memberUser.card);
                }
              }
            } else {
              if (user.card) {
                response.userCards.push(user.card);
              }
            }
          }
        });
      }

      for (const log of logs) {
        const user = users.find(x => x.card === log.card);

        if (log.op === "err") {
          data.addLogEntry(existingTool.id, user ? user.id : null, log.time, log.op, log.card, 0);
        } else if (log.op === "in" || log.op === "out") {
          if (!user) {
            console.log("Can't find user with card " + log.card);
            continue;
          }
          data.addLogEntry(existingTool.id, user.id, log.time, log.op, null, log.spindleTime);
        }
      }

      if (logs && logs.length) {
        sendUpdate();
      }
    } else {
      data.addTool(mac);
      sendUpdate();
    }

    res.json(response);
  });

  router.get('/tools/:id/checkout-users', requireAuth, (req, res) => {
    const toolId = parseInt(req.params.id, 10);
    if (isNaN(toolId)) {
      res.status(400).json(ApiResponse.mkErr("Invalid tool ID"));
      return;
    }
    const tools: Tool[] = data.getTools();
    if (!tools.find(x => x.id === toolId)) {
      res.status(404).json(ApiResponse.mkErr("Tool not found"));
      return;
    }
    const users = data.getToolCheckoutUsers(toolId);
    res.json(ApiResponse.mkData(users));
  });

  router.post('/tools/:id/set-checkout-users', requireAuth, validateBody(SetCheckoutUsersSchema), (req, res) => {
    const toolId = parseInt(req.params.id, 10);
    if (isNaN(toolId)) {
      res.status(400).json(ApiResponse.mkErr("Invalid tool ID"));
      return;
    }
    const tools: Tool[] = data.getTools();
    if (!tools.find(x => x.id === toolId)) {
      res.status(404).json(ApiResponse.mkErr("Tool not found"));
      return;
    }
    const { userIds } = req.body;
    if (data.setToolCheckoutUsers(toolId, userIds)) {
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }
  });

  router.get('/tools/utilstats', requireAuth, (req, res) => {
    console.log('api/tools/utilstats called.');
    const result = data.getToolsUtilStats();
    res.json(ApiResponse.mkData(result));
  });

  router.get('/tools/:id/log', requireAuth, (req, res) => {
    const toolId = parseInt(req.params.id, 10);
    if (isNaN(toolId)) {
      res.status(400).json(ApiResponse.mkErr("Invalid tool ID"));
      return;
    }
    const tools: Tool[] = data.getTools();
    if (!tools.find(x => x.id === toolId)) {
      res.status(404).json(ApiResponse.mkErr("Tool not found"));
      return;
    }
    const log = data.getToolLog(toolId);
    res.json(ApiResponse.mkData(log));
  });

  router.post('/tools/topusers', requireAuth, validateBody(ToolTopUsersSchema), (req, res) => {
    const { toolId } = req.body;
    const tools: Tool[] = data.getTools();

    if (!tools.find(x => x.id === toolId)) {
      res.status(400).json(ApiResponse.mkErr("Tool not found"));
      return;
    }

    console.log('api/tools/topusers called.');
    const result = data.getToolTopUsers(toolId);
    res.json(ApiResponse.mkData(result));
  });

  router.get('/tools', requireAuth, (req, res) => {
    console.log('api/tools called.');
    const tools: Tool[] = data.getTools();

    for (const tool of tools) {
      const lastSeen = watchdog.find(x => x.toolMac === tool.mac);
      tool.offline = !lastSeen || (getTime() - lastSeen.timestamp) > 30;
      tool.version = lastSeen ? lastSeen.version : undefined;
    }
    res.json(ApiResponse.mkData(tools));
  });

  router.post('/tool/delete', requireAuth, validateBody(DeleteSchema), (req, res) => {
    console.log('api/tool/delete called.');
    const tools: Tool[] = data.getTools();
    const { id: toolId } = req.body;
    const tool = tools.find(x => x.id === toolId);

    if (!tool) {
      res.status(400).json(ApiResponse.mkErr("Tool not found"));
      return;
    }

    if (data.deleteTool(toolId)) {
      audit(req, `Deleted tool ${tool.name}(${toolId})`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/tool/setlockout', requireAuth, validateBody(SetLockoutSchema), (req, res) => {
    console.log('api/tool/setlockout called.');
    const tools: Tool[] = data.getTools();
    const { id: toolId, islocked: isLocked } = req.body;
    const tool = tools.find(x => x.id === toolId);

    if (!tool) {
      res.status(400).json(ApiResponse.mkErr("Tool not found"));
      return;
    }

    if (data.setToolLockout(toolId, isLocked)) {
      audit(req, (isLocked ? "Locked out " : "Unlocked ") + `${tool.name}(${toolId})`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/tool/edit', requireAuth, validateBody(EditToolSchema), (req, res) => {
    console.log('api/tool/edit called');
    const users: User[] = data.getUsers();
    const tools: Tool[] = data.getTools();

    const { toolId, toolName, toolUsers } = req.body;
    const tool = tools.find(x => x.id === toolId);
    if (!tool) {
      res.status(400).json(ApiResponse.mkErr("Tool not found"));
      return;
    }

    if (toolName) {
      if (data.editTool(tool.id, toolName)) {
        audit(req, `Renamed ${tool.name}(${toolId})`);
      }
    }

    if (toolUsers) {
      const newUsers: number[] = [];
      toolUsers.forEach((toolUser: number) => {
        if (users.find(x => x.id === toolUser)) {
          newUsers.push(toolUser);
        } else {
          console.log("User " + toolUser + " not found");
        }
      });

      if (data.setToolUsers(tool.id, newUsers)) {
        const add: number[] = newUsers.filter(x => !tool.users.includes(x));
        const del: number[] = tool.users.filter(x => !newUsers.includes(x));
        audit(req, `Set tool users for ${tool.name}(${toolId}): add ` + add.join(",") + ", remove " + del.join(","));
      }
    }

    res.json(ApiResponse.mkOk());
    sendUpdate();
  });

  return router;
}

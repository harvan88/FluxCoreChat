import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// List of requested files
const filesList = [
'AccountDataAuditPanel.md','AccountDeletionModal.md','AccountDeletionWizard.md','AccountOrphanExplorer.md','AccountsSection.md','AccountSwitcher.md',
'ActivityBar.md','ActivityIndicator.md','ActivityTest.md','AgentDetail.md','AgentList.md','AgentsView.md','AgentView.md','AIStatusHeader.md',
'AIStatusIndicator.md','AISuggestionCard.md','AssetMonitoringPanel.md','AssistantList.md','AssistantsView.md','AssistantsView.OLD.md',
'AssistantsView.original.md','AttachmentPanel.md','AudioRecorderPanel.md','AuthPage.md','AutomationSection.md','Avatar.md','AvatarUpload.md',
'Badge.md','Button.md','CameraCaptureModal.md','Card.md','ChatComposer.md','ChatHeroHeader.md','ChatOptionsMenu.md','ChatView.md','ChatWidget.md',
'Checkbox.md','CollaboratorsList.md','CollapsibleSection.md','CollectionView.md','ComponentPreviewGallery.md','ComponentShowcase.md',
'ConnectionIndicator.md','ContactDetails.md','ContactsList.md','ConversationRowAIStatus.md','ConversationsList.md','CopyButton.md','CreditsSection.md',
'DebugPanel.md','DeleteMessageModal.md','DetailHeader.md','DocumentationQualityPanel.md','DoubleConfirmationDeleteButton.md','DynamicContainer.md',
'DynamicProfileHeader.md','EditableName.md','EmojiPanel.md','EmptyState.md','EnrichmentBadge.md','EntityActions.md','ErrorState.md','ExpandedEditor.md',
'ExtensionCard.md','ExtensionConfigPanel.md','ExtensionsPanel.md','FileUploader.md','FluxCoreComposer.md','FluxCoreIcon.md','FluxCorePanel.md',
'FluxCorePromptInspectorPanel.md','FluxCoreSidebar.md','FluxiList.md','FluxiProposedWorkDetail.md','FluxiView.md','FluxiWorkDetail.md','IdCopyable.md',
'Input.md','InstructionList.md','InstructionsView.md','InstructionsView.original.md','InvitationsList.md','InviteCollaborator.md','KernelConsole.md',
'KernelSessionsSection.md','Layout.md','LoadingState.md','LocalVectorStoreDetail.md','LocalVectorStoresView.md','manifest.md','MessageBubble.md',
'MonitoringHub.md','MonitoringSidebar.md','OpenAIAssistantConfigView.md','OpenAIAssistantEditor.md','OpenAIIcon.md','OpenAIVectorStoreDetail.md',
'OpenAIVectorStoresView.md','ParticipantsActivityBar.md','PoliciesView.md','ProfileChatBlock.md','ProfileChatBlockDesktop.md','ProfileChatBlockMobile.md',
'ProfileSection.md','PublicChatContainer.md','PublicProfileComposer.md','PublicProfileHeader.md','PublicProfileLayout.md','PublicProfilePage.md',
'ResetPasswordPage.md','ResourceSelector.md','RuntimeSelectorModal.md','RuntimeSwitcher.md','Select.md','SettingsMenu.md','SettingsPanel.md','Sidebar.md',
'SidebarLayout.md','SidebarNavList.md','SliderInput.md','StandardComposer.md','StatusBadge.md','SuggestResponsePanel.md','Switch.md','SystemMonitor.md',
'TabBar.md','Table.md','TemplateCard.md','TemplateList.md','TemplatePreview.md','ThemeToggle.md','ToastStack.md','ToolsSidebar.md','ToolsView.md',
'TracesView.md','UnifiedChatView.md','UsageView.md','VectorStoreDiagnosticSection.md','VectorStoreFilesSection.md','VectorStoreList.md','VectorStoresView.md',
'VectorStoreTestQuery.md','ViewContainer.md','ViewPort.md','VisualPipeline.md','WebsiteBuilderPanel.md','WebsiteBuilderSidebar.md','WelcomeMessage.md',
'WelcomeView.md','WorkResolver.md',
'account-activation.service.md','account-avatar.routes.md','account-deletion-auth.md','account-deletion.admin.routes.md','account-deletion.admin.service.md',
'account-deletion.external.md','account-deletion.guard.md','account-deletion.local.md','account-deletion.processor.md','account-deletion.public.routes.md',
'account-deletion.queue.md','account-deletion.snapshot.service.md','account-deletion.worker.md','account-label.service.md','actor-resolution.service.md',
'actors.routes.md','adapters.routes.md','agent-runtime.adapter.md','ai-branding.service.md','ai-circuit-breaker.service.md','ai-execution-plan.md',
'ai-suggestion-store.md','ai-template.service.md','ai.routes.md','appointments.routes.md','asistentes-local.runtime.md','asistentes-openai.runtime.md',
'asset-audit.service.md','asset-cleanup.worker.md','asset-deletion.service.md','asset-relations.routes.md','asset-relations.service.md','assets.routes.md',
'audio-converter.service.md','audio-processing.service.md','auth.middleware.md','auth.routes.md','automation-scheduler.service.md','automation.routes.md',
'base.projector.md','chat-projector.md','chatcore-outbox.service.md','chatcore-webchat-gateway.service.md','chatcore-world-definer.md','cognition-worker.md',
'condition-evaluator.md','contacts.routes.md','context-access.service.md','context-bus.md','context-extractor.service.md','context.routes.md',
'conversation-freeze.service.md','conversation-gc.service.md','conversations.routes.md','credits.routes.md','documentation-quality.routes.md','engine.md',
'error-tracking.md','extension-permissions.service.md','extension.service.md','extensions.routes.md','file.service.md','flow-registry.md',
'flux-runtime-config.service.md','fluxcore-agents.routes.md','fluxcore-runtime.adapter.md','fluxcore-runtime.routes.md','fluxcore.routes.md',
'fluxi-dependency-injection.md','fluxi.runtime.md','health.md','internal-ai.routes.md','internal-credits.routes.md','kernel-console.routes.md',
'kernel-dispatcher.md','kernel-sessions.routes.md','kernel.md','knowledge.capability.md','local-storage.adapter.md','manifest-loader.service.md',
'mdx-parser.service.md','message-core-transactional.md','message-core.md','message-deletion.service.md','message-version.service.md','messages.routes.md',
'metrics.service.md','openai.driver.md','permission-validator.service.md','permissions.routes.md','projector-runner.md','public-profile.routes.md',
'rag-config.routes.md','relationship-context.service.md','routes-accounts.md','routes-relationships.md','routes-test.md','s3-storage.adapter.md',
'scope-enforcer.md','services-automation-controller.md','services-fluxcore-assistants.md','services-fluxcore-cognitive-dispatcher.md',
'services-fluxcore-reality-adapter.md','services-fluxcore-runtime-gateway.md','services-runtime-gateway.md','static-generator.service.md',
'storage-adapter.factory.md','storage-adapter.interface.md','system-admin.routes.md','telemetry.service.md','template-registry.service.md',
'template-settings.service.md','templates.capability.md','templates.routes.md','testing-switch.service.md','tool-registry.service.md',
'vector-store-deletion.service.md','vector-store-sync.service.md','website.routes.md','website.service.md','websocket.routes.md','wes-scheduler.service.md',
'work-definition.service.md','works.routes.md','workspaces.routes.md'
];

const ROOT = process.cwd();
const DOCS_BASE = join(ROOT, 'docs/reconstruction-phase-1/exhaustive-mapping');
const UI_DOCS = join(DOCS_BASE, '01-ui-landscape');
const BACKEND_DOCS = join(DOCS_BASE, '02-backend-landscape');

const excludePatterns = ['node_modules', 'dist', 'build', '.git'];

function scanDir(dir: string, extMap: Map<string, string>) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const fullPath = join(dir, f);
    if (statSync(fullPath).isDirectory()) {
      if (!excludePatterns.some(p => fullPath.includes(p))) scanDir(fullPath, extMap);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const baseName = f.replace(/\.tsx?$/, '');
      const relPath = fullPath.replace(ROOT, '').replace(/^[\\\/]+/, '').replace(/\\/g, '/');
      extMap.set(baseName.toLowerCase(), relPath);
    }
  }
}

console.log("Escaneando código fuente...");
const sourceMap = new Map<string, string>();
scanDir(join(ROOT, 'apps/web/src'), sourceMap);
scanDir(join(ROOT, 'apps/api/src'), sourceMap);
scanDir(join(ROOT, 'packages/db/src'), sourceMap);

console.log(`Encontrados ${sourceMap.size} archivos fuente.`);

function isPascalCase(str: string) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str.replace('.md', '').split('.')[0]); // Ignore .OLD, .original
}

function processFile(filename: string) {
  const isUI = isPascalCase(filename);
  const targetDir = isUI ? UI_DOCS : BACKEND_DOCS;
  const docPath = join(targetDir, filename);
  
  const baseName = filename.replace(/\.md$/, '').replace(/\.(OLD|original)$/, '');
  const location = sourceMap.get(baseName.toLowerCase()) || (isUI ? 'apps/web/src/missing/' + baseName + '.tsx' : 'apps/api/src/missing/' + baseName + '.ts');

  let content = '';
  let frontmatter: any = {
    id: filename.replace(/\.md$/, '').toLowerCase().replace(/_/g, '-'),
    type: isUI ? 'ui-component' : 'core',
    status: 'wip',
    criticality: 'medium',
    location: location
  };

  let hasDoubts = false;

  if (existsSync(docPath)) {
    const raw = readFileSync(docPath, 'utf8');
    try {
      const parsed = matter(raw);
      if (Object.keys(parsed.data).length > 0) {
        frontmatter = { ...frontmatter, ...parsed.data };
        content = parsed.content;
      } else {
        content = raw;
      }
    } catch {
      content = raw;
    }
  } else {
    // Scaffold new doc
    content = `
# 🤖 ${baseName}

## 🎯 Propósito
(Definir el propósito aquí)

`;
    if (!isUI) {
      content += `
## 🏗️ Arquitectura
(Definir la arquitectura o flujo del sistema aquí)

## 🔗 Dependencias
(Definir consumos y referencias)
`;
    } else {
      content += `
## 🧩 Props / Estado
(Definir estado y props)

## 💡 Ejemplo de Uso
\`\`\`tsx
// Ejemplo
\`\`\`
`;
    }
  }

  // Check for technical doubts
  const textToAnalyze = content.replace(/\`\`\`[\s\S]*?\`\`\`/g, '');
  if (textToAnalyze.match(/duda técnica|dudas técnicas|duda:|pregunta:|investigar|verificar|confirmar|TODO:/i)) {
    hasDoubts = true;
  }

  // Adjust Frontmatter based on content
  // "los documentos que están estables están estables y si tienen dudas están en dudas"
  if (hasDoubts) {
    frontmatter.status = 'needs_review';
  } else if (frontmatter.status === 'needs_review' && !hasDoubts) {
    // If it was needs_review but no explicit doubts, maybe it's stable if content is sufficient
    // We'll leave it wip or stable based on current. If it was needs_review we can upgrade to stable if it has all sections
    if (content.length > 300) frontmatter.status = 'stable';
    else frontmatter.status = 'wip';
  }

  if (!frontmatter.location) frontmatter.location = location;

  // Enforce types mapping
  if (isUI) {
    if (frontmatter.type !== 'ui-component' && frontmatter.type !== 'smart-component') {
      frontmatter.type = content.includes('use') || content.includes('useState') || content.includes('useQuery') ? 'smart-component' : 'ui-component';
    }
  } else {
    if (frontmatter.type !== 'core' && frontmatter.type !== 'subsystem' && frontmatter.type !== 'backend-service') {
      frontmatter.type = 'core';
    }
  }

  const newDoc = matter.stringify(content, frontmatter);
  writeFileSync(docPath, newDoc, 'utf8');
}

let count = 0;
for (const f of filesList) {
  processFile(f);
  count++;
}

console.log(`Procesados ${count} archivos según 00-STANDARD.md`);

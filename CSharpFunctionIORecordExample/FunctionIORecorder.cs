// <copyright file="FunctionIORecorder.cs" company="Microsoft">
//     Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace FodyDemo
{
    /// <summary>
    /// UtGenAttribute
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public sealed class UtGenAttribute : Attribute 
    { 
    }

#pragma warning disable CA1801
#pragma warning disable CA1724
#pragma warning disable SA1515
#pragma warning disable SA1307 // Accessible fields should begin with upper-case letter
#pragma warning disable SA1502 // Element should not be on a single line
#pragma warning disable CA1051 // Do not declare visible instance fields
#pragma warning disable CA1819 // Mark members as static
#pragma warning disable SA1516 // Elements should be separated by blank line
#pragma warning disable SA1600 // Elements should be documented
#pragma warning disable CA1822 // Mark members as static
#pragma warning disable CS8632 // The annotation for nullable reference types should only be used in code within a '#nullable' annotations context.
#pragma warning disable CA1002
    /// <summary>
    /// FunctionCallNode
    /// </summary>
    public class FunctionCallNode
    {
        /// <summary>
        /// DateTime
        /// </summary>
        public DateTime DateTime { get; set; }

        /// <summary>
        /// ModuleName
        /// </summary>
        public string? ModuleName { get; set; }

        /// <summary>
        /// NamespaceName
        /// </summary>
        public string? NamespaceName { get; set; }
        public string[] ConstructorParamTypes { get; set; }
        public string? MethodName { get; set; }
        public string? ClassName { get; set; }
        public string? MethodSig { get; set; }
        public ConcurrentBag<FunctionCallNode> Children { get { return children; } set { this.children = value; } }
        private ConcurrentBag<FunctionCallNode> children;
        public object[] Input { get; set; }
        public string[] InputTypes { get; set; }
        public object? Output { get; set; }
        public string? OutputType { get; set; }
        public string[] UsedNamespaces { get; set; }
        public StackFrame? StackFrame { get; set; }
        public Type? InstanceType { get; set; }
        public Dictionary<string, string> TypesMap { get; set; }
        public bool IsAbstract { get; set; }
        public bool IsVirtual { get; set; }
        public string CodeFileName { get; set; } = "";
        public int CodeStartLine { get; set; } = 0;
        public int CodeStartCharacter { get; set; } = 0;

        public FunctionCallNode(){}
        
        public FunctionCallNode(MethodInfo methodInfo, object[] args)
        {
            DateTime = DateTime.Now;
            ModuleName = methodInfo.DeclaringType.Module.Name;
            NamespaceName = methodInfo.DeclaringType.Namespace;
            ClassName = methodInfo.DeclaringType.Name;
            ConstructorParamTypes = Array.Empty<string>();
            MethodName = methodInfo.Name;
            MethodSig = FuncSigUtil.GetMethodSigFromMethodInfo(methodInfo);
            children = new ConcurrentBag<FunctionCallNode>();
            Input = args;
            InputTypes = methodInfo.GetParameters().Select(paramInfo => FuncSigUtil.GetTypeSignature(paramInfo.ParameterType)).ToArray();
            Output = null;
            OutputType = FuncSigUtil.GetTypeSignature(methodInfo.ReturnType);
            UsedNamespaces = FuncSigUtil.GetUsedNamespaces(methodInfo);
            StackFrame = new StackTrace(true).GetFrame(2);
            InstanceType = methodInfo.DeclaringType;
            TypesMap = new Dictionary<string, string>();
            IsAbstract = methodInfo.IsAbstract;
            IsVirtual = methodInfo.IsVirtual;
            // absolute path
            CodeFileName = StackFrame?.GetFileName() ?? "";
            // the line is start from 0
            CodeStartLine = StackFrame?.GetFileLineNumber() ?? 0;
            CodeStartCharacter = StackFrame?.GetFileColumnNumber() ?? 0;
        }
    }

    public sealed class NodeStackSingleton
    {
        private static readonly Lazy<NodeStackSingleton> lazy =
            new Lazy<NodeStackSingleton>(() => new NodeStackSingleton());

        public static NodeStackSingleton Instance { get { return lazy.Value; } }

        public Stack<FunctionCallNode> nodeStack = new Stack<FunctionCallNode>();

        private NodeStackSingleton()
        {
        }
    }

    public class Utils
    {
        public static void Serilization(FunctionCallNode node, string fileNameWithPath)
        {
            string fileString = "[]";
            if (File.Exists(fileNameWithPath))
            {
                fileString = File.ReadAllText(fileNameWithPath);
            }

            List<FunctionCallNode>? nodes = JsonConvert.DeserializeObject<List<FunctionCallNode>>(fileString);
            var result = nodes ?? new List<FunctionCallNode>();
            if (result.Count == 0)
            {
                result.Add(node);
            } 
            else
            {
                int index = result.FindIndex(record =>
                    record.MethodSig == node.MethodSig &&
                    record.ClassName == node.ClassName &&
                    record.NamespaceName == node.NamespaceName &&
                    record.ModuleName == node.ModuleName);

                if (index != -1)
                {
                    if (result[index].DateTime < node.DateTime)
                    {
                        result[index] = node;
                    }
                } 
                else
                {
                    result.Add(node);
                }
            }

            string jsonString = JsonConvert.SerializeObject(result, Formatting.Indented);
            File.WriteAllText(fileNameWithPath, jsonString);
        } 
    }

    [AttributeUsage(AttributeTargets.Module | AttributeTargets.Assembly)]
    public sealed class IntersectMethodsMarkedByAttribute : Attribute
    {
        private readonly string filePath = $"{System.IO.Directory.GetCurrentDirectory()}\\funcIORec.json";
        private FunctionCallNode? CurrentNode { get; set; }
        private FunctionCallNode? ParentNode { get; set; }
        private bool RecordFlag { get; set; }
        private List<List<Type>> AllConstructorParams { get; set; } = new List<List<Type>>();
        public Type[] Types { get; }

        // Required
        public IntersectMethodsMarkedByAttribute() { }

        public IntersectMethodsMarkedByAttribute(params Type[] types)
        {
            Types = types;
        }
        
        public void Init(object instance, MethodBase method, object[] args)
        {
            if (method.IsConstructor)
            {
                return;
            }
            MethodInfo? methodInfo = method as MethodInfo;
            if (methodInfo == null || methodInfo.DeclaringType == null)
            {
                return;
            }
            NodeStackSingleton parentNodeInstance = NodeStackSingleton.Instance;
            ParentNode = parentNodeInstance.nodeStack.Count == 0 ? null : parentNodeInstance.nodeStack.Last();
            CurrentNode = new FunctionCallNode(methodInfo, args);
            AllConstructorParams = FuncSigUtil.GetAllConstructorParamTypes(methodInfo);

            // TODO: not safe in mutithread. such as parallelForeach
            // only process one user request in same time 
            var a = new StackTrace().GetFrame(2)?.GetMethod();
            var b = ParentNode?.StackFrame?.GetMethod();
            if (ParentNode != null &&
                !ReferenceEquals(new StackTrace().GetFrame(2)?.GetMethod(), ParentNode.StackFrame?.GetMethod()))
            {
                return;
            }

            if (CurrentNode.IsAbstract || CurrentNode.IsVirtual)
            {
                ParentNode?.Children.Add(CurrentNode);
            }
            parentNodeInstance.nodeStack.Push(CurrentNode);
            RecordFlag = true;
        }
        public void OnExit(object result)
        {
            if (!RecordFlag || CurrentNode == null) { return; }
            NodeStackSingleton nodeStack = NodeStackSingleton.Instance;
            CurrentNode.Output = result;
            ChooseTheConstructor();
            if (ParentNode == null)
            {
                Utils.Serilization(CurrentNode, filePath);
            }
            nodeStack.nodeStack.Pop();
        }

        public void OnEntry()
        {
        }

        public void OnExit()
        {
            if (!RecordFlag || CurrentNode == null) { return; }
            NodeStackSingleton nodeStack = NodeStackSingleton.Instance;
            ChooseTheConstructor();
            if (ParentNode == null)
            {
                Utils.Serilization(CurrentNode, filePath);
            }
            nodeStack.nodeStack.Pop();
        }

        public void OnException(Exception exception)
        {
        }

        private void ChooseTheConstructor()
        {
            HashSet<Type> subFuncInstanceTypes = new HashSet<Type> { };
            if (CurrentNode == null)
            {
                return;
            }
            foreach (var subFunc in CurrentNode.Children)
            {
                if (subFunc.InstanceType != null) 
                {
                    subFuncInstanceTypes.Add(subFunc.InstanceType);
                }
            }

            int minTypesDiffCount = int.MaxValue;
            List<Type> neededConstructorParamTypes = new List<Type>();
            Dictionary<Type, Type> typesMap = new Dictionary<Type, Type>();
            foreach (var paramTypes in AllConstructorParams)
            {
                int typesDiffCount = paramTypes.Count - subFuncInstanceTypes.Count;
                if (minTypesDiffCount < typesDiffCount) 
                {
                    continue;
                }
                bool assignable = true;
                Dictionary<Type, Type> map = new Dictionary<Type, Type>();
                foreach (var instanceType in subFuncInstanceTypes)
                {
                    if (!paramTypes.Any(paramType =>
                    {
                        if (paramType.IsAssignableFrom(instanceType))
                        {
                            map.Add(instanceType, paramType);
                            return true;
                        }
                        return false;
                    }))
                    {
                        assignable = false;
                        break;
                    }
                }
                if (assignable)
                {
                    minTypesDiffCount = typesDiffCount;
                    typesMap = map;
                    neededConstructorParamTypes = paramTypes;
                    if (minTypesDiffCount == 0) 
                    { 
                        break;
                    }
                }
            }
            if (neededConstructorParamTypes.Count != 0)
            {
                CurrentNode.ConstructorParamTypes = neededConstructorParamTypes.Select(paramType => FuncSigUtil.GetTypeSignature(paramType)).ToArray();
                CurrentNode.TypesMap.Clear(); 
                foreach ( var item in typesMap ) 
                {
                    string key = FuncSigUtil.GetTypeSignature(item.Key);
                    string value = FuncSigUtil.GetTypeSignature(item.Value);
                    CurrentNode.TypesMap[key] = value;
                }
            }
        }
    }
}

#pragma warning restore CS8632 // The annotation for nullable reference types should only be used in code within a '#nullable' annotations context.
#pragma warning restore CA1822 // Mark members as static
#pragma warning restore SA1600 // Elements should be documented
#pragma warning restore SA1516 // Elements should be separated by blank line
#pragma warning restore CA1819 // Mark members as static
#pragma warning restore CA1051 // Do not declare visible instance fields
#pragma warning restore SA1502 // Element should not be on a single line
#pragma warning restore SA1307 // Accessible fields should begin with upper-case letter
#pragma warning restore SA1515
#pragma warning restore CA1724
#pragma warning restore CA1801
#pragma warning restore CA1002